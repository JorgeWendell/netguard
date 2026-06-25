import type { MikrotikRecord, MikrotikSession, MikrotikServiceData } from "./types";
import {
  buildServiceKey,
  getFirstRecord,
  mikrotikSetWithFallback,
  parseBool,
} from "./utils";

export type UpdateNtpInput = {
  enabled: boolean;
  servers: string;
};

async function supportsNtpServerSubmenu(
  session: MikrotikSession,
): Promise<boolean> {
  try {
    await session.write("/system/ntp/client/servers/print");
    return true;
  } catch {
    return false;
  }
}

async function fetchNtpClientServerAddresses(
  session: MikrotikSession,
): Promise<string | undefined> {
  const entries = (await session
    .write("/system/ntp/client/servers/print")
    .catch(() => [])) as MikrotikRecord[];

  const addresses = entries
    .map((entry) => entry.address?.trim())
    .filter((address): address is string => Boolean(address));

  return addresses.length > 0 ? addresses.join(",") : undefined;
}

export async function fetchNtpClientRecord(
  session: MikrotikSession,
): Promise<MikrotikRecord | null> {
  const records = (await session
    .write("/system/ntp/client/print")
    .catch(() => [])) as MikrotikRecord[];

  const record = getFirstRecord(records);
  if (!record) return null;

  if (record.servers?.trim()) {
    return record;
  }

  const servers = await fetchNtpClientServerAddresses(session);
  if (servers) {
    return { ...record, servers };
  }

  return record;
}

async function syncNtpClientServerEntries(
  session: MikrotikSession,
  servers: string,
): Promise<void> {
  const existing = (await session
    .write("/system/ntp/client/servers/print")
    .catch(() => [])) as MikrotikRecord[];

  const desired = servers
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean);

  for (const entry of existing) {
    const id = entry[".id"];
    if (id) {
      await session
        .write("/system/ntp/client/servers/remove", [`=.id=${id}`])
        .catch(() => undefined);
    }
  }

  for (const address of desired) {
    await session
      .write("/system/ntp/client/servers/add", [`=address=${address}`])
      .catch(() => undefined);
  }
}

export async function updateNtpClientSettings(
  session: MikrotikSession,
  input: UpdateNtpInput,
): Promise<void> {
  const record = await fetchNtpClientRecord(session);
  const submenuSupported = await supportsNtpServerSubmenu(session);

  const idParam =
    record?.[".id"] != null ? [`=.id=${record[".id"]}`] : [];
  const enabledParams = [
    ...idParam,
    `=enabled=${input.enabled ? "yes" : "no"}`,
  ];

  if (submenuSupported) {
    await session.write("/system/ntp/client/set", enabledParams);
    await syncNtpClientServerEntries(session, input.servers);
    return;
  }

  await mikrotikSetWithFallback(session, "/system/ntp/client/set", [
    [...enabledParams, `=servers=${input.servers}`],
    enabledParams,
  ]);

  if (input.servers.trim()) {
    await syncNtpClientServerEntries(session, input.servers);
  }
}

function mapNtpClient(record: MikrotikRecord): MikrotikServiceData | null {
  const service = buildServiceKey("ntp-client", record, {
    fallbackId: "settings",
  });
  if (!service) return null;

  const enabled = parseBool(record.enabled);
  const servers = record.servers?.trim();

  const descriptionParts = [
    record.mode ? `Modo ${record.mode}` : null,
    servers ? `Servidores ${servers}` : null,
    record.vrf ? `VRF ${record.vrf}` : null,
  ].filter(Boolean);

  return {
    service,
    description: descriptionParts.join(" · ") || "Cliente NTP",
    status: enabled
      ? servers
        ? "syncing"
        : "enabled-no-servers"
      : "disabled",
    enabled,
    running: enabled && Boolean(servers),
  };
}

function mapNtpServer(record: MikrotikRecord): MikrotikServiceData | null {
  const service = buildServiceKey("ntp-server", record, {
    fallbackId: "settings",
  });
  if (!service) return null;

  const enabled = parseBool(record.enabled);
  const multicast = parseBool(record.multicast);
  const broadcast = parseBool(record.broadcast);

  const descriptionParts = [
    multicast ? "Multicast" : null,
    broadcast ? "Broadcast" : null,
  ].filter(Boolean);

  return {
    service,
    description: descriptionParts.join(" · ") || "Servidor NTP local",
    status: enabled ? "active" : "disabled",
    enabled,
    running: enabled,
  };
}

export async function fetchNtpServices(
  session: MikrotikSession,
): Promise<MikrotikServiceData[]> {
  const serverRecords = await session
    .write("/system/ntp/server/print")
    .catch(() => [] as MikrotikRecord[]);

  const services: MikrotikServiceData[] = [];

  const serverRecord = getFirstRecord(serverRecords);
  if (serverRecord) {
    const mapped = mapNtpServer(serverRecord);
    if (mapped) services.push(mapped);
  }

  return services;
}
