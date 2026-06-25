import type { MikrotikRecord, MikrotikSession, MikrotikServiceData } from "./types";
import { buildServiceKey, parseBool } from "./utils";

function mapPppoeClient(record: MikrotikRecord): MikrotikServiceData | null {
  const service = buildServiceKey("pppoe-client", record);
  if (!service) return null;

  const disabled = parseBool(record.disabled);
  const running = parseBool(record.running);

  const descriptionParts = [
    record.interface ? `Interface ${record.interface}` : null,
    record.user ? `Usuário ${record.user}` : null,
    record.profile ? `Profile ${record.profile}` : null,
  ].filter(Boolean);

  return {
    service,
    description: descriptionParts.join(" · ") || undefined,
    status: disabled ? "disabled" : running ? "connected" : "disconnected",
    enabled: !disabled,
    running,
    interfaceName: record.name ?? record.interface,
  };
}

export async function fetchPppoeClients(
  session: MikrotikSession,
): Promise<MikrotikServiceData[]> {
  const records = (await session
    .write("/interface/pppoe-client/print")
    .catch(() => [])) as MikrotikRecord[];

  return records
    .map(mapPppoeClient)
    .filter((service): service is MikrotikServiceData => service !== null);
}
