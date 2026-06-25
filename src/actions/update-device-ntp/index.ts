"use server";

import { actionClient } from "@/lib/next-safe-action";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import { updateDeviceNtp } from "@/services/mikrotik/access/update-ntp";
import { updateDeviceNtpSchema } from "./schema";

export const updateDeviceNtpAction = actionClient
  .schema(updateDeviceNtpSchema)
  .action(async ({ parsedInput }) => {
    await withDeviceSession(parsedInput.deviceId, (session) =>
      updateDeviceNtp(session, {
        enabled: parsedInput.enabled,
        servers: parsedInput.servers,
      }),
    );

    return { success: true };
  });
