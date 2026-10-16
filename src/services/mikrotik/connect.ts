import { Resolver } from "dns/promises";
import { isIP } from "net";
import { RouterOSAPI } from "node-routeros";

import type { MikrotikDeviceCredentials, MikrotikSession } from "./types";

const CONNECTION_TIMEOUT = 15;

/** DNS públicos — evita EAI_AGAIN do getaddrinfo no Alpine/Docker com *.mynetname.net */
const PUBLIC_DNS_SERVERS = ["8.8.8.8", "1.1.1.1", "8.8.4.4"];

const publicResolver = new Resolver();
publicResolver.setServers(PUBLIC_DNS_SERVERS);

/**
 * Resolve hostname MikroTik (Cloud DDNS) para IPv4 sem usar o DNS embutido
 * do Docker/musl, que falha com getaddrinfo EAI_AGAIN no Node.
 * IPs literais e falhas de DNS mantêm o host original.
 */
export async function resolveMikrotikHost(host: string): Promise<string> {
  const trimmed = host.trim();
  if (!trimmed || isIP(trimmed)) {
    return trimmed;
  }

  try {
    const addresses = await publicResolver.resolve4(trimmed);
    if (addresses[0]) {
      return addresses[0];
    }
  } catch {
    // mantém hostname — node-routeros tenta de novo
  }

  return trimmed;
}

export async function connect(
  credentials: MikrotikDeviceCredentials,
  timeoutSeconds = CONNECTION_TIMEOUT,
): Promise<MikrotikSession> {
  const host = await resolveMikrotikHost(credentials.host);

  const session = new RouterOSAPI({
    host,
    user: credentials.username,
    password: credentials.password,
    port: credentials.apiPort,
    timeout: timeoutSeconds,
    keepalive: false,
    ...(credentials.apiSsl
      ? { tls: { rejectUnauthorized: false } }
      : {}),
  });

  await session.connect();
  return session;
}

export function disconnect(session: MikrotikSession): void {
  try {
    session.close();
  } catch {
    // ignore close errors
  }
}
