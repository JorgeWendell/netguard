import type { MikrotikRecord, MikrotikSession } from "./types";
import { fetchInterfaceList } from "./interfaces";
import { parseBool, parseIntSafe } from "./utils";

export type BridgeData = {
  id: string;
  name: string;
  comment?: string;
  disabled: boolean;
  vlanFiltering: boolean;
  mtu?: number;
};

export type BridgePortData = {
  id: string;
  bridge: string;
  interface: string;
  disabled: boolean;
  priority?: number;
  pvid?: number;
};

export type BridgeAccessData = {
  bridges: Array<BridgeData & { ports: BridgePortData[] }>;
  availableInterfaces: Array<{ name: string; type?: string }>;
};

export type CreateBridgeInput = {
  name: string;
  comment?: string;
  vlanFiltering?: boolean;
};

export type UpdateBridgeInput = {
  bridgeId: string;
  name?: string;
  comment?: string;
  disabled?: boolean;
  vlanFiltering?: boolean;
};

async function print(
  session: MikrotikSession,
  path: string,
): Promise<MikrotikRecord[]> {
  return session.write(path).catch(() => [] as MikrotikRecord[]);
}

function mapBridge(record: MikrotikRecord): BridgeData | null {
  const id = record[".id"];
  const name = record.name;
  if (!id || !name) return null;

  return {
    id,
    name,
    comment: record.comment,
    disabled: parseBool(record.disabled),
    vlanFiltering: parseBool(record["vlan-filtering"]),
    mtu: parseIntSafe(record.mtu) ?? undefined,
  };
}

function mapBridgePort(record: MikrotikRecord): BridgePortData | null {
  const id = record[".id"];
  const bridge = record.bridge;
  const iface = record.interface;
  if (!id || !bridge || !iface) return null;

  return {
    id,
    bridge,
    interface: iface,
    disabled: parseBool(record.disabled),
    priority: parseIntSafe(record.priority) ?? undefined,
    pvid: parseIntSafe(record.pvid) ?? undefined,
  };
}

export async function fetchBridges(
  session: MikrotikSession,
): Promise<BridgeData[]> {
  const records = await print(session, "/interface/bridge/print");
  return records
    .map(mapBridge)
    .filter((bridge): bridge is BridgeData => bridge !== null);
}

export async function fetchBridgePorts(
  session: MikrotikSession,
): Promise<BridgePortData[]> {
  const records = await print(session, "/interface/bridge/port/print");
  return records
    .map(mapBridgePort)
    .filter((port): port is BridgePortData => port !== null);
}

export async function fetchBridgeAccessData(
  session: MikrotikSession,
): Promise<BridgeAccessData> {
  const [bridges, ports, interfaces] = await Promise.all([
    fetchBridges(session),
    fetchBridgePorts(session),
    fetchInterfaceList(session),
  ]);

  const usedInterfaces = new Set(ports.map((port) => port.interface));
  const availableInterfaces = interfaces
    .filter(
      (iface) => iface.type !== "bridge" && !usedInterfaces.has(iface.name),
    )
    .map((iface) => ({
      name: iface.name,
      type: iface.type,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    bridges: bridges.map((bridge) => ({
      ...bridge,
      ports: ports.filter((port) => port.bridge === bridge.name),
    })),
    availableInterfaces,
  };
}

export async function createBridge(
  session: MikrotikSession,
  input: CreateBridgeInput,
): Promise<void> {
  const params = [`=name=${input.name}`];

  if (input.comment?.trim()) {
    params.push(`=comment=${input.comment.trim()}`);
  }

  if (input.vlanFiltering) {
    params.push("=vlan-filtering=yes");
  }

  await session.write("/interface/bridge/add", params);
}

export async function updateBridge(
  session: MikrotikSession,
  input: UpdateBridgeInput,
): Promise<void> {
  const params: string[] = [`=.id=${input.bridgeId}`];

  if (input.name !== undefined) {
    params.push(`=name=${input.name}`);
  }
  if (input.comment !== undefined) {
    params.push(`=comment=${input.comment}`);
  }
  if (input.disabled !== undefined) {
    params.push(`=disabled=${input.disabled ? "yes" : "no"}`);
  }
  if (input.vlanFiltering !== undefined) {
    params.push(`=vlan-filtering=${input.vlanFiltering ? "yes" : "no"}`);
  }

  await session.write("/interface/bridge/set", params);
}

export async function removeBridge(
  session: MikrotikSession,
  bridgeId: string,
  bridgeName: string,
): Promise<void> {
  const ports = await fetchBridgePorts(session);

  for (const port of ports.filter((entry) => entry.bridge === bridgeName)) {
    await session.write("/interface/bridge/port/remove", [`=.id=${port.id}`]);
  }

  await session.write("/interface/bridge/remove", [`=.id=${bridgeId}`]);
}

export async function addBridgePort(
  session: MikrotikSession,
  bridgeName: string,
  interfaceName: string,
): Promise<void> {
  await session.write("/interface/bridge/port/add", [
    `=bridge=${bridgeName}`,
    `=interface=${interfaceName}`,
  ]);
}

export async function removeBridgePort(
  session: MikrotikSession,
  portId: string,
): Promise<void> {
  await session.write("/interface/bridge/port/remove", [`=.id=${portId}`]);
}
