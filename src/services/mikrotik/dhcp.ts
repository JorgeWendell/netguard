import type { MikrotikRecord, MikrotikSession, MikrotikServiceData } from "./types";
import { buildServiceKey, parseBool } from "./utils";

function mapDhcpServer(record: MikrotikRecord): MikrotikServiceData | null {
  const service = buildServiceKey("dhcp-server", record);
  if (!service) return null;

  const disabled = parseBool(record.disabled);
  const invalid = parseBool(record.invalid);
  const dynamic = parseBool(record.dynamic);

  const descriptionParts = [
    record.interface ? `Interface ${record.interface}` : null,
    record["address-pool"] ? `Pool ${record["address-pool"]}` : null,
    record["lease-time"] ? `Lease ${record["lease-time"]}` : null,
  ].filter(Boolean);

  return {
    service,
    description: descriptionParts.join(" · ") || undefined,
    status: invalid
      ? "invalid"
      : disabled
        ? "disabled"
        : dynamic
          ? "dynamic"
          : "active",
    enabled: !disabled,
    running: !disabled && !invalid,
    interfaceName: record.interface,
  };
}

export async function fetchDhcpServers(
  session: MikrotikSession,
): Promise<MikrotikServiceData[]> {
  const records = (await session
    .write("/ip/dhcp-server/print")
    .catch(() => [])) as MikrotikRecord[];

  return records
    .map(mapDhcpServer)
    .filter((service): service is MikrotikServiceData => service !== null);
}

/** Reservado para coleta profunda de leases DHCP. */
export async function fetchDhcpLeases(
  session: MikrotikSession,
): Promise<MikrotikRecord[]> {
  return session
    .write("/ip/dhcp-server/lease/print")
    .catch(() => [] as MikrotikRecord[]);
}
