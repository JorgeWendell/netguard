import type {
  MikrotikInterfaceData,
  MikrotikInterfaceStats,
  MikrotikRecord,
  MikrotikSession,
} from "./types";
import { parseBool, parseIntSafe } from "./utils";

export function mapInterfaceRecord(
  record: MikrotikRecord,
): MikrotikInterfaceData | null {
  const interfaceId = record[".id"];
  const name = record.name;

  if (!interfaceId || !name) {
    return null;
  }

  return {
    interfaceId,
    name,
    type: record.type,
    macAddress: record["mac-address"],
    mtu: parseIntSafe(record.mtu) ?? undefined,
    actualMtu: parseIntSafe(record["actual-mtu"]) ?? undefined,
    l2Mtu: parseIntSafe(record.l2mtu) ?? undefined,
    speed: record.speed,
    duplex: record.duplex,
    running: parseBool(record.running),
    enabled: !parseBool(record.disabled),
    slave: parseBool(record.slave),
    parentName: record.interface,
    rxBytes: parseIntSafe(record["rx-byte"]) ?? undefined,
    txBytes: parseIntSafe(record["tx-byte"]) ?? undefined,
    rxPackets: parseIntSafe(record["rx-packet"]) ?? undefined,
    txPackets: parseIntSafe(record["tx-packet"]) ?? undefined,
    rxErrors: parseIntSafe(record["rx-error"]) ?? undefined,
    txErrors: parseIntSafe(record["tx-error"]) ?? undefined,
    linkDowns: parseIntSafe(record["link-downs"]) ?? undefined,
    comment: record.comment,
  };
}

export function trafficFromInterfaces(
  interfaces: MikrotikInterfaceData[],
): MikrotikInterfaceStats {
  return interfaces.reduce(
    (totals, iface) => ({
      download: totals.download + (iface.rxBytes ?? 0),
      upload: totals.upload + (iface.txBytes ?? 0),
    }),
    { download: 0, upload: 0 },
  );
}

export async function fetchInterfaceList(
  session: MikrotikSession,
): Promise<MikrotikInterfaceData[]> {
  const records = (await session
    .write("/interface/print")
    .catch(() => [])) as MikrotikRecord[];

  return records
    .map(mapInterfaceRecord)
    .filter((iface): iface is MikrotikInterfaceData => iface !== null);
}

export async function fetchInterfaceStats(
  session: MikrotikSession,
): Promise<MikrotikInterfaceStats> {
  const interfaces = await fetchInterfaceList(session);
  return trafficFromInterfaces(interfaces);
}
