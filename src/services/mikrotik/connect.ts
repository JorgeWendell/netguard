import { Resolver } from "dns/promises";
import { isIP } from "net";
import { RouterOSAPI } from "node-routeros";

import type { MikrotikDeviceCredentials, MikrotikSession } from "./types";

const CONNECTION_TIMEOUT = 20;
const CONNECT_RETRIES = 3;
const DNS_CACHE_TTL_MS = 5 * 60 * 1000;
const PUBLIC_DNS_SERVERS = ["8.8.8.8", "1.1.1.1", "8.8.4.4"];

const publicResolver = new Resolver();
publicResolver.setServers(PUBLIC_DNS_SERVERS);

type DnsCacheEntry = {
  ip: string;
  expiresAt: number;
};

const dnsCache = new Map<string, DnsCacheEntry>();
const lastGoodIp = new Map<string, string>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function resolveMikrotikHost(host: string): Promise<string> {
  const trimmed = host.trim();
  if (!trimmed || isIP(trimmed)) {
    return trimmed;
  }

  const cached = dnsCache.get(trimmed);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.ip;
  }

  try {
    const addresses = await publicResolver.resolve4(trimmed);
    const ip = addresses[0];
    if (ip) {
      dnsCache.set(trimmed, {
        ip,
        expiresAt: Date.now() + DNS_CACHE_TTL_MS,
      });
      lastGoodIp.set(trimmed, ip);
      return ip;
    }
  } catch {
    const previous = lastGoodIp.get(trimmed);
    if (previous) {
      return previous;
    }
  }

  return trimmed;
}

export async function connect(
  credentials: MikrotikDeviceCredentials,
  timeoutSeconds = CONNECTION_TIMEOUT,
): Promise<MikrotikSession> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= CONNECT_RETRIES; attempt++) {
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

    try {
      await session.connect();
      return session;
    } catch (error) {
      lastError = error;
      try {
        session.close();
      } catch {
        // ignore
      }

      if (attempt < CONNECT_RETRIES) {
        await sleep(800 * attempt);
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Falha ao conectar no equipamento");
}

export function disconnect(session: MikrotikSession): void {
  try {
    session.close();
  } catch {
    // ignore close errors
  }
}
