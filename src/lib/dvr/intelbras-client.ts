import { createHash, randomBytes } from "node:crypto";

const REQUEST_TIMEOUT_MS = 8000;

export type DvrConnectionConfig = {
  host: string;
  httpPort: number;
  username: string;
  password: string;
};

export type DvrChannel = {
  channel: number;
  name: string;
};

export type DvrProbeResult = {
  serialNumber: string | null;
  model: string | null;
  channels: DvrChannel[];
};

export class DvrConnectionError extends Error {}

function md5(value: string) {
  return createHash("md5").update(value).digest("hex");
}

function parseDigestChallenge(header: string) {
  const challenge = header.slice(header.toLowerCase().indexOf("digest") + 6);
  const params: Record<string, string> = {};
  const pattern = /(\w+)=(?:"([^"]*)"|([^\s,]*))/g;
  let match = pattern.exec(challenge);

  while (match) {
    params[match[1].toLowerCase()] = match[2] ?? match[3];
    match = pattern.exec(challenge);
  }

  return params;
}

function buildDigestHeader(
  challenge: Record<string, string>,
  config: DvrConnectionConfig,
  uri: string,
) {
  const nonceCount = "00000001";
  const clientNonce = randomBytes(8).toString("hex");
  const useQop = challenge.qop?.split(",").map((q) => q.trim()).includes("auth");
  const ha1 = md5(`${config.username}:${challenge.realm}:${config.password}`);
  const ha2 = md5(`GET:${uri}`);
  const response = useQop
    ? md5(`${ha1}:${challenge.nonce}:${nonceCount}:${clientNonce}:auth:${ha2}`)
    : md5(`${ha1}:${challenge.nonce}:${ha2}`);

  const parts = [
    `username="${config.username}"`,
    `realm="${challenge.realm}"`,
    `nonce="${challenge.nonce}"`,
    `uri="${uri}"`,
    `response="${response}"`,
  ];

  if (challenge.opaque) parts.push(`opaque="${challenge.opaque}"`);
  if (useQop) {
    parts.push(`qop=auth`, `nc=${nonceCount}`, `cnonce="${clientNonce}"`);
  }

  return `Digest ${parts.join(", ")}`;
}

function buildBasicHeader(config: DvrConnectionConfig) {
  const token = Buffer.from(`${config.username}:${config.password}`).toString(
    "base64",
  );
  return `Basic ${token}`;
}

async function fetchWithTimeout(url: string, authorization?: string) {
  return fetch(url, {
    method: "GET",
    headers: authorization ? { Authorization: authorization } : undefined,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: "no-store",
  });
}

async function dvrRequest(config: DvrConnectionConfig, path: string) {
  const url = `http://${config.host}:${config.httpPort}${path}`;

  let firstResponse: Response;

  try {
    firstResponse = await fetchWithTimeout(url);
  } catch {
    throw new DvrConnectionError(
      "Sem resposta do DVR. Verifique o endereço, a porta HTTP e o acesso de rede.",
    );
  }

  if (firstResponse.status !== 401) {
    if (!firstResponse.ok) {
      throw new DvrConnectionError(
        `O DVR respondeu com erro HTTP ${firstResponse.status}.`,
      );
    }
    return firstResponse.text();
  }

  const authenticate = firstResponse.headers.get("www-authenticate") ?? "";
  const isDigest = authenticate.toLowerCase().includes("digest");
  const authorization = isDigest
    ? buildDigestHeader(parseDigestChallenge(authenticate), config, path)
    : buildBasicHeader(config);

  let authResponse: Response;

  try {
    authResponse = await fetchWithTimeout(url, authorization);
  } catch {
    throw new DvrConnectionError("O DVR parou de responder durante o login.");
  }

  if (authResponse.status === 401) {
    throw new DvrConnectionError(
      "Usuário ou senha inválidos (ou conta bloqueada no DVR).",
    );
  }

  if (!authResponse.ok) {
    throw new DvrConnectionError(
      `O DVR respondeu com erro HTTP ${authResponse.status}.`,
    );
  }

  return authResponse.text();
}

function parseKeyValueLines(body: string) {
  const entries: Record<string, string> = {};

  body.split(/\r?\n/).forEach((line) => {
    const separatorIndex = line.indexOf("=");
    if (separatorIndex > 0) {
      entries[line.slice(0, separatorIndex).trim()] = line
        .slice(separatorIndex + 1)
        .trim();
    }
  });

  return entries;
}

async function fetchSystemInfo(config: DvrConnectionConfig) {
  const body = await dvrRequest(
    config,
    "/cgi-bin/magicBox.cgi?action=getSystemInfo",
  );
  const info = parseKeyValueLines(body);

  let model = info.deviceType || null;

  if (!model) {
    try {
      const typeBody = await dvrRequest(
        config,
        "/cgi-bin/magicBox.cgi?action=getDeviceType",
      );
      model = parseKeyValueLines(typeBody).type || null;
    } catch {
      model = null;
    }
  }

  return { serialNumber: info.serialNumber || null, model };
}

async function fetchChannelTitles(config: DvrConnectionConfig) {
  const body = await dvrRequest(
    config,
    "/cgi-bin/configManager.cgi?action=getConfig&name=ChannelTitle",
  ).catch(() => "");
  const channels: DvrChannel[] = [];
  const pattern = /table\.ChannelTitle\[(\d+)\]\.Name=(.*)/g;
  let match = pattern.exec(body);

  while (match) {
    const channel = Number(match[1]) + 1;
    channels.push({
      channel,
      name: match[2].trim() || `Câmera ${channel}`,
    });
    match = pattern.exec(body);
  }

  return channels;
}

async function fetchChannels(config: DvrConnectionConfig) {
  const titledChannels = await fetchChannelTitles(config);

  if (titledChannels.length > 0) {
    return titledChannels;
  }

  const collectBody = await dvrRequest(
    config,
    "/cgi-bin/devVideoInput.cgi?action=getCollect",
  );
  const total = Number(parseKeyValueLines(collectBody).result);

  if (!Number.isInteger(total) || total <= 0) {
    throw new DvrConnectionError(
      "Não foi possível obter a lista de canais do DVR.",
    );
  }

  return Array.from({ length: total }, (_, index) => ({
    channel: index + 1,
    name: `Câmera ${index + 1}`,
  }));
}

export async function probeDvr(
  config: DvrConnectionConfig,
): Promise<DvrProbeResult> {
  const systemInfo = await fetchSystemInfo(config);
  const channels = await fetchChannels(config);

  return { ...systemInfo, channels };
}
