import type { MikrotikRecord, MikrotikSession, MikrotikServiceData } from "./types";
import {
  getFirstRecord,
  mikrotikSetWithFallback,
  parseBool,
  recordHasField,
} from "./utils";

export type DnsSetPath = "/ip/dns/set" | "/ip/dns/settings/set";

export type DnsSettingsSource = {
  record: MikrotikRecord;
  setPath: DnsSetPath;
};

export type UpdateDnsInput = {
  servers: string;
  allowRemoteRequests: boolean;
};

function isDnsSettingsRecord(record: MikrotikRecord): boolean {
  if (record.name && record.type) {
    return false;
  }

  return (
    recordHasField(record, "servers") ||
    recordHasField(record, "allow-remote-requests") ||
    recordHasField(record, "dynamic-servers") ||
    recordHasField(record, "cache-size")
  );
}

function buildDnsUpdateParams(
  record: MikrotikRecord | undefined,
  input: UpdateDnsInput,
): string[] {
  const params: string[] = [];

  if (!record || recordHasField(record, "servers")) {
    params.push(`=servers=${input.servers}`);
  }

  if (!record || recordHasField(record, "allow-remote-requests")) {
    params.push(
      `=allow-remote-requests=${input.allowRemoteRequests ? "yes" : "no"}`,
    );
  }

  if (params.length === 0) {
    params.push(`=servers=${input.servers}`);
    params.push(
      `=allow-remote-requests=${input.allowRemoteRequests ? "yes" : "no"}`,
    );
  }

  return params;
}

export async function fetchDnsSettingsRecord(
  session: MikrotikSession,
): Promise<DnsSettingsSource | null> {
  const primary = (await session
    .write("/ip/dns/print")
    .catch(() => [])) as MikrotikRecord[];

  const primaryRecord = getFirstRecord(primary);
  if (primaryRecord && isDnsSettingsRecord(primaryRecord)) {
    return { record: primaryRecord, setPath: "/ip/dns/set" };
  }

  const fallback = (await session
    .write("/ip/dns/settings/print")
    .catch(() => [])) as MikrotikRecord[];

  const fallbackRecord = getFirstRecord(fallback);
  if (fallbackRecord) {
    return {
      record: fallbackRecord,
      setPath: "/ip/dns/settings/set",
    };
  }

  if (primaryRecord) {
    return { record: primaryRecord, setPath: "/ip/dns/set" };
  }

  return null;
}

export async function updateDnsSettings(
  session: MikrotikSession,
  input: UpdateDnsInput,
): Promise<void> {
  const source = await fetchDnsSettingsRecord(session);
  const baseParams = buildDnsUpdateParams(source?.record, input);

  const withId =
    source?.record[".id"] != null
      ? [`=.id=${source.record[".id"]}`, ...baseParams]
      : baseParams;

  const paramVariants = [
    withId,
    withId.filter((param) => !param.includes("allow-remote-requests")),
    withId.filter((param) => !param.includes("servers=")),
  ].filter(
    (variant, index, variants) =>
      variant.length > 0 &&
      variants.findIndex((other) => other.join() === variant.join()) === index,
  );

  const paths: DnsSetPath[] = source
    ? [source.setPath]
    : ["/ip/dns/set", "/ip/dns/settings/set"];

  let lastError: unknown;
  for (const setPath of paths) {
    try {
      await mikrotikSetWithFallback(session, setPath, paramVariants);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Não foi possível atualizar DNS no equipamento");
}

async function printDnsSettings(
  session: MikrotikSession,
): Promise<MikrotikRecord | undefined> {
  const source = await fetchDnsSettingsRecord(session);
  return source?.record;
}

function mapDnsSettings(record: MikrotikRecord): MikrotikServiceData {
  const servers = record.servers?.trim();
  const dynamicServers = record["dynamic-servers"]?.trim();
  const remoteRequests = parseBool(record["allow-remote-requests"]);
  const allServers = [servers, dynamicServers].filter(Boolean).join(", ");
  const configured = Boolean(allServers);

  const descriptionParts = [
    allServers ? `Servidores ${allServers}` : null,
    remoteRequests ? "Permite requisições remotas" : null,
    record["use-doh-server"] ? `DoH ${record["use-doh-server"]}` : null,
  ].filter(Boolean);

  return {
    service: "dns:settings",
    description: descriptionParts.join(" · ") || "Resolver DNS",
    status: configured
      ? "configured"
      : remoteRequests
        ? "resolver-only"
        : "not-configured",
    enabled: configured || remoteRequests,
    running: configured,
  };
}

export async function fetchDnsServices(
  session: MikrotikSession,
): Promise<MikrotikServiceData[]> {
  const record = await printDnsSettings(session);
  if (!record) {
    return [];
  }

  return [mapDnsSettings(record)];
}
