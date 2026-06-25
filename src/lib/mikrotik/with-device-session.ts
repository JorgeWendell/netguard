import { connect, disconnect } from "@/services/mikrotik/connect";
import type { MikrotikSession } from "@/services/mikrotik/types";

import { getDeviceCredentials } from "./get-device-credentials";

type SessionOptions = {
  timeoutSeconds?: number;
};

export async function withDeviceSession<T>(
  deviceId: string,
  fn: (session: MikrotikSession) => Promise<T>,
  options: SessionOptions = {},
): Promise<T> {
  const device = await getDeviceCredentials(deviceId);

  if (!device) {
    throw new Error("Equipamento não encontrado");
  }

  const session = await connect(
    {
      host: device.host,
      apiPort: device.apiPort,
      apiSsl: device.apiSsl,
      username: device.username,
      password: device.password,
    },
    options.timeoutSeconds,
  );

  try {
    return await fn(session);
  } finally {
    disconnect(session);
  }
}
