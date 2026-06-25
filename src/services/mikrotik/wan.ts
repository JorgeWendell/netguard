import type { MikrotikRecord, MikrotikSession, MikrotikWanData } from "./types";
import { isVpnOrTunnelInterface } from "@/lib/mikrotik/is-vpn-interface";
import { pingWanLink } from "./wan-ping";
import {
  getFirstRecord,
  parseBool,
  parseIntSafe,
} from "./utils";

async function print(
  session: MikrotikSession,
  path: string,
  queries: string[] = [],
): Promise<MikrotikRecord[]> {
  return session.write(path, queries).catch(() => [] as MikrotikRecord[]);
}

function parseAddressIp(address?: string): string | undefined {
  if (!address) return undefined;
  return address.split("/")[0]?.trim() || undefined;
}

function resolveRouteInterface(route: MikrotikRecord): string | undefined {
  if (route.interface) {
    return route.interface;
  }

  if (route["vrf-interface"]) {
    return route["vrf-interface"];
  }

  const gatewayStatus = route["gateway-status"];
  const viaMatch = gatewayStatus?.match(/via\s+(\S+)/i);
  if (viaMatch?.[1]) {
    return viaMatch[1];
  }

  const immediateGw = route["immediate-gw"];
  if (immediateGw?.includes("%")) {
    return immediateGw.split("%")[0]?.trim() || undefined;
  }

  return undefined;
}

function resolveGateway(route: MikrotikRecord): string | undefined {
  if (route.gateway) {
    return route.gateway;
  }

  const immediateGw = route["immediate-gw"];
  if (immediateGw?.includes("%")) {
    return immediateGw.split("%")[1]?.trim() || undefined;
  }

  return undefined;
}

function resolveDns(dhcp?: MikrotikRecord): string | undefined {
  if (!dhcp) return undefined;

  const servers = [dhcp["primary-dns"], dhcp["secondary-dns"]].filter(Boolean);
  return servers.length > 0 ? servers.join(", ") : undefined;
}

/** IP público via /tool fetch (ipify), com fallback no IP Cloud do RouterOS. */
export async function fetchPublicIp(
  session: MikrotikSession,
): Promise<string | undefined> {
  try {
    const result = (await session.write("/tool/fetch", [
      "=url=https://api.ipify.org",
      "=mode=https",
      "=output=user",
      "=as-value",
    ])) as MikrotikRecord[];

    const record = getFirstRecord(result);
    const raw = record?.data ?? record?.ret;
    if (raw) {
      const ip = String(raw).trim();
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) {
        return ip;
      }
    }
  } catch {
    // Sem WAN, firewall ou permissão para fetch HTTPS
  }

  const cloud = await print(session, "/ip/cloud/print");
  const publicAddress = getFirstRecord(cloud)?.["public-address"]?.trim();
  return publicAddress || undefined;
}

export async function fetchWanList(
  session: MikrotikSession,
): Promise<MikrotikWanData[]> {
  const [routes, addresses, dhcpClients, pppoeClients, interfaces] =
    await Promise.all([
      print(session, "/ip/route/print", ["?dst-address=0.0.0.0/0"]),
      print(session, "/ip/address/print"),
      print(session, "/ip/dhcp-client/print"),
      print(session, "/interface/pppoe-client/print"),
      print(session, "/interface/print"),
    ]);

  const publicIp = await fetchPublicIp(session);
  const interfaceTypes = new Map(
    interfaces.map((iface) => [iface.name, iface.type]),
  );
  const interfaceRunning = new Map(
    interfaces.map((iface) => [iface.name, parseBool(iface.running)]),
  );

  const wanByInterface = new Map<
    string,
    MikrotikWanData & { routingTable?: string }
  >();

  for (const route of routes) {
    if (parseBool(route.disabled) || parseBool(route.inactive)) {
      continue;
    }

    const iface =
      resolveRouteInterface(route) ??
      (route[".id"] ? `route-${route[".id"]}` : undefined);

    if (!iface) {
      continue;
    }

    if (isVpnOrTunnelInterface(iface, interfaceTypes.get(iface))) {
      continue;
    }

    const gateway = resolveGateway(route);
    const priority = parseIntSafe(route.distance) ?? undefined;
    const routingTable = route["routing-table"]?.trim() || undefined;
    const address = addresses.find((item) => item.interface === iface);
    const dhcp = dhcpClients.find((item) => item.interface === iface);
    const pppoe = pppoeClients.find(
      (item) => item.name === iface || item.interface === iface,
    );

    const routeActive = parseBool(route.active);
    const ifaceRunning = interfaceRunning.get(iface) ?? true;
    const pppoeRunning = pppoe ? parseBool(pppoe.running) : true;
    const linkUp = routeActive && ifaceRunning && pppoeRunning;

    const candidate = {
      interface: iface,
      provider: pppoe?.user ?? dhcp?.comment ?? route.comment ?? undefined,
      gateway,
      localIp: parseAddressIp(address?.address),
      publicIp,
      dns: resolveDns(dhcp),
      online: linkUp,
      priority,
      routingTable,
    };

    const existing = wanByInterface.get(iface);
    if (!existing) {
      wanByInterface.set(iface, candidate);
      continue;
    }

    const existingPriority = existing.priority ?? Number.MAX_SAFE_INTEGER;
    const candidatePriority = priority ?? Number.MAX_SAFE_INTEGER;

    if (candidatePriority < existingPriority) {
      wanByInterface.set(iface, candidate);
    }
  }

  const wans = Array.from(wanByInterface.values()).sort(
    (a, b) => (a.priority ?? 999) - (b.priority ?? 999),
  );

  for (const wan of wans) {
    const ping = await pingWanLink(session, {
      interface: wan.interface,
      gateway: wan.gateway,
      localIp: wan.localIp,
      routingTable: wan.routingTable,
    });

    wan.online = ping.online;
    wan.latencyMs = ping.latencyMs;
    wan.packetLoss = ping.packetLoss;
  }

  return wans.map(({ routingTable: _routingTable, ...wan }) => wan);
}
