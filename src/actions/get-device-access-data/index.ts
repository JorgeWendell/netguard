"use server";

import { actionClient } from "@/lib/next-safe-action";
import { getDeviceCredentials } from "@/lib/mikrotik/get-device-credentials";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import { fetchDeviceAccessData } from "@/services/mikrotik/access/fetch-access-data";
import { getDeviceAccessDataSchema } from "./schema";

export const getDeviceAccessDataAction = actionClient
  .schema(getDeviceAccessDataSchema)
  .action(async ({ parsedInput }) => {
    const device = await getDeviceCredentials(parsedInput.deviceId);

    if (!device) {
      return { success: false, error: "Equipamento não encontrado" };
    }

    const data = await withDeviceSession(parsedInput.deviceId, (session) =>
      fetchDeviceAccessData(session),
    );

    return {
      success: true,
      device: {
        id: device.id,
        name: device.name,
        host: device.host,
      },
      data,
    };
  });
