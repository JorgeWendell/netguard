"use server";

import { actionClient } from "@/lib/next-safe-action";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import { updateDeviceDns } from "@/services/mikrotik/access/update-dns";
import { updateDeviceDnsSchema } from "./schema";

export const updateDeviceDnsAction = actionClient
  .schema(updateDeviceDnsSchema)
  .action(async ({ parsedInput }) => {
    await withDeviceSession(parsedInput.deviceId, (session) =>
      updateDeviceDns(session, {
        servers: parsedInput.servers,
        allowRemoteRequests: parsedInput.allowRemoteRequests,
      }),
    );

    return { success: true };
  });
