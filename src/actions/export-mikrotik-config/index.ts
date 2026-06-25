"use server";

import { actionClient } from "@/lib/next-safe-action";
import { getDeviceCredentials } from "@/lib/mikrotik/get-device-credentials";
import { persistConfigSnapshot } from "@/lib/mikrotik/persist-config-snapshot";
import { connect, disconnect } from "@/services/mikrotik/connect";
import { exportDeviceConfig } from "@/services/mikrotik/backup";
import { exportMikrotikConfigSchema } from "./schema";

export const exportMikrotikConfigAction = actionClient
  .schema(exportMikrotikConfigSchema)
  .action(async ({ parsedInput }) => {
    const device = await getDeviceCredentials(parsedInput.deviceId);

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
      120,
    );

    let config: string;

    try {
      config = await exportDeviceConfig(session, {
        host: device.host,
        apiPort: device.apiPort,
        apiSsl: device.apiSsl,
        username: device.username,
        password: device.password,
      });
    } finally {
      disconnect(session);
    }

    const snapshot = await persistConfigSnapshot(parsedInput.deviceId, config);

    const date = snapshot.createdAt.toISOString().slice(0, 10);
    const safeName = device.name.replace(/[^\w.\-()+ ]/g, "_");
    const fileName = `${safeName}-${date}.rsc`;

    return {
      success: true,
      snapshotId: snapshot.id,
      createdAt: snapshot.createdAt.toISOString(),
      size: config.length,
      fileName,
    };
  });
