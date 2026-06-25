import { RouterOSAPI } from "node-routeros";

import type { MikrotikDeviceCredentials, MikrotikSession } from "./types";

const CONNECTION_TIMEOUT = 15;

export async function connect(
  credentials: MikrotikDeviceCredentials,
  timeoutSeconds = CONNECTION_TIMEOUT,
): Promise<MikrotikSession> {
  const session = new RouterOSAPI({
    host: credentials.host,
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
