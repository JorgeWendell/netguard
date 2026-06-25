import type { MikrotikRecord, MikrotikSession, MikrotikServiceData } from "./types";
import { fetchCertificates } from "./certificates";
import { buildServiceKey, mikrotikSetWithFallback, parseBool } from "./utils";

export type OpenVpnClientData = {
  id: string;
  name: string;
  connectTo?: string;
  port?: string;
  mode?: string;
  user?: string;
  profile?: string;
  certificate?: string;
  cipher?: string;
  auth?: string;
  comment?: string;
  disabled: boolean;
  running: boolean;
  verifyServerCertificate: boolean;
  addDefaultRoute: boolean;
  routeNopull: boolean;
};

export type OpenVpnAccessData = {
  clients: OpenVpnClientData[];
  pppProfiles: string[];
  certificates: string[];
};

export type CreateOpenVpnClientInput = {
  name: string;
  connectTo: string;
  port?: string;
  mode?: string;
  user?: string;
  password?: string;
  profile?: string;
  certificate?: string;
  cipher?: string;
  auth?: string;
  comment?: string;
  disabled?: boolean;
  verifyServerCertificate?: boolean;
  addDefaultRoute?: boolean;
  routeNopull?: boolean;
};

export type UpdateOpenVpnClientInput = {
  clientId: string;
  name?: string;
  connectTo?: string;
  port?: string;
  mode?: string;
  user?: string;
  password?: string;
  profile?: string;
  certificate?: string;
  cipher?: string;
  auth?: string;
  comment?: string;
  disabled?: boolean;
  verifyServerCertificate?: boolean;
  addDefaultRoute?: boolean;
  routeNopull?: boolean;
};

async function printOvpnClients(
  session: MikrotikSession,
): Promise<MikrotikRecord[]> {
  return session
    .write("/interface/ovpn-client/print")
    .catch(() => [] as MikrotikRecord[]);
}

function splitConnectTo(record: MikrotikRecord): {
  host?: string;
  port?: string;
} {
  const connectTo = record["connect-to"]?.trim();
  const explicitPort = record.port?.trim();

  if (!connectTo) {
    return { port: explicitPort };
  }

  if (connectTo.includes(":")) {
    const [host, port] = connectTo.split(":", 2);
    return {
      host: host || undefined,
      port: explicitPort ?? port,
    };
  }

  return {
    host: connectTo,
    port: explicitPort,
  };
}

export function mapOpenVpnClientAccess(
  record: MikrotikRecord,
): OpenVpnClientData | null {
  const id = record[".id"];
  const name = record.name;
  if (!id || !name) return null;

  const { host, port } = splitConnectTo(record);

  return {
    id,
    name,
    connectTo: host,
    port: port ?? "1194",
    mode: record.mode ?? "ip",
    user: record.user,
    profile: record.profile,
    certificate: record.certificate,
    cipher: record.cipher,
    auth: record.auth,
    comment: record.comment,
    disabled: parseBool(record.disabled),
    running: parseBool(record.running),
    verifyServerCertificate: parseBool(record["verify-server-certificate"]),
    addDefaultRoute: parseBool(record["add-default-route"], true),
    routeNopull: parseBool(record["route-nopull"]),
  };
}

function parseConnectTo(connectTo?: string): {
  publicIp?: string;
  port?: string;
} {
  if (!connectTo) return {};

  const [host, port] = connectTo.includes(":")
    ? connectTo.split(":", 2)
    : [connectTo, undefined];

  return { publicIp: host, port };
}

function mapOpenVpnClient(record: MikrotikRecord): MikrotikServiceData | null {
  const service = buildServiceKey("openvpn-client", record);
  if (!service) return null;

  const disabled = parseBool(record.disabled);
  const running = parseBool(record.running);
  const connectTo = record["connect-to"];
  const { publicIp } = parseConnectTo(connectTo);

  const descriptionParts = [
    connectTo ? `Servidor ${connectTo}` : null,
    record.user ? `Usuário ${record.user}` : null,
    record.profile ? `Profile ${record.profile}` : null,
  ].filter(Boolean);

  return {
    service,
    description: descriptionParts.join(" · ") || undefined,
    status: disabled ? "disabled" : running ? "connected" : "disconnected",
    enabled: !disabled,
    running,
    publicIp,
    interfaceName: record.name,
  };
}

function buildOpenVpnParams(
  input: CreateOpenVpnClientInput | UpdateOpenVpnClientInput,
  embedPortInConnectTo = false,
): string[] {
  const params: string[] = [];

  const setString = (apiKey: string, value?: string) => {
    if (value === undefined) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    params.push(`=${apiKey}=${trimmed}`);
  };

  const setBool = (apiKey: string, value?: boolean) => {
    if (value === undefined) return;
    params.push(`=${apiKey}=${value ? "yes" : "no"}`);
  };

  if ("name" in input && input.name !== undefined) {
    setString("name", input.name);
  }

  const host = input.connectTo?.trim();
  const port = input.port?.trim();

  if (host) {
    const connectValue =
      embedPortInConnectTo && port && !host.includes(":")
        ? `${host}:${port}`
        : host;
    params.push(`=connect-to=${connectValue}`);
  }

  if (port && !embedPortInConnectTo) {
    params.push(`=port=${port}`);
  }

  setString("mode", input.mode);
  setString("user", input.user);
  setString("password", input.password);
  setString("profile", input.profile);
  setString("certificate", input.certificate);
  setString("cipher", input.cipher);
  setString("auth", input.auth);
  setString("comment", input.comment);

  setBool("disabled", input.disabled);
  setBool("verify-server-certificate", input.verifyServerCertificate);
  setBool("add-default-route", input.addDefaultRoute);
  setBool("route-nopull", input.routeNopull);

  return params;
}

const OPTIONAL_OVPN_KEYS = [
  "route-nopull",
  "add-default-route",
  "verify-server-certificate",
  "cipher",
  "auth",
  "certificate",
  "mode",
  "profile",
  "comment",
  "port",
  "password",
] as const;

function dedupeParamVariants(variants: string[][]): string[][] {
  return variants.filter(
    (variant, index, all) =>
      variant.length > 0 &&
      all.findIndex((other) => other.join() === variant.join()) === index,
  );
}

function buildOpenVpnParamVariants(
  input: CreateOpenVpnClientInput | UpdateOpenVpnClientInput,
): string[][] {
  const variants: string[][] = [];

  for (const embedPort of [false, true]) {
    const base = buildOpenVpnParams(input, embedPort);
    if (base.length === 0) continue;

    variants.push(base);

    let current = [...base];
    for (const key of OPTIONAL_OVPN_KEYS) {
      const next = current.filter((param) => !param.startsWith(`=${key}=`));
      if (next.length !== current.length && next.length > 0) {
        current = next;
        variants.push([...current]);
      }
    }
  }

  return dedupeParamVariants(variants);
}

export async function fetchOpenVpnClients(
  session: MikrotikSession,
): Promise<MikrotikServiceData[]> {
  const records = await printOvpnClients(session);

  return records
    .map(mapOpenVpnClient)
    .filter((service): service is MikrotikServiceData => service !== null);
}

export async function fetchOpenVpnAccessData(
  session: MikrotikSession,
): Promise<OpenVpnAccessData> {
  const [clientRecords, profileRecords, certificateRecords] = await Promise.all([
    printOvpnClients(session),
    session.write("/ppp/profile/print").catch(() => [] as MikrotikRecord[]),
    fetchCertificates(session),
  ]);

  const clients = clientRecords
    .map(mapOpenVpnClientAccess)
    .filter((client): client is OpenVpnClientData => client !== null);

  const pppProfiles = profileRecords
    .map((record) => record.name)
    .filter((name): name is string => Boolean(name))
    .sort((a, b) => a.localeCompare(b));

  const certificates = certificateRecords
    .map((certificate) => certificate.name)
    .sort((a, b) => a.localeCompare(b));

  return { clients, pppProfiles, certificates };
}

export async function createOpenVpnClient(
  session: MikrotikSession,
  input: CreateOpenVpnClientInput,
): Promise<void> {
  const variants = buildOpenVpnParamVariants(input);

  if (!variants.some((variant) => variant.some((param) => param.startsWith("=name=")))) {
    throw new Error("Nome do cliente OpenVPN é obrigatório");
  }

  await mikrotikSetWithFallback(
    session,
    "/interface/ovpn-client/add",
    variants,
  );
}

export async function updateOpenVpnClient(
  session: MikrotikSession,
  input: UpdateOpenVpnClientInput,
): Promise<void> {
  const records = await printOvpnClients(session);
  const record = records.find((entry) => entry[".id"] === input.clientId);

  if (!record) {
    throw new Error("Cliente OpenVPN não encontrado");
  }

  const variants = buildOpenVpnParamVariants(input).map((params) => [
    `=.id=${input.clientId}`,
    ...params,
  ]);

  if (variants.length === 0) {
    return;
  }

  await mikrotikSetWithFallback(
    session,
    "/interface/ovpn-client/set",
    variants,
  );
}

export async function removeOpenVpnClient(
  session: MikrotikSession,
  clientId: string,
): Promise<void> {
  await session.write("/interface/ovpn-client/remove", [`=.id=${clientId}`]);
}

/** Reservado para coleta de sessões OpenVPN server. */
export async function fetchOpenVpnServerInterfaces(
  session: MikrotikSession,
): Promise<MikrotikRecord[]> {
  return session
    .write("/interface/ovpn-server/print")
    .catch(() => [] as MikrotikRecord[]);
}
