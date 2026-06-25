"use server";

import { actionClient } from "@/lib/next-safe-action";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import { rebootDevice } from "@/services/mikrotik/system-update";
import { deviceUpdateDeviceIdSchema } from "@/actions/device-update/schema";

export const rebootDeviceAction = actionClient
  .schema(deviceUpdateDeviceIdSchema)
  .action(async ({ parsedInput }) => {
    await withDeviceSession(
      parsedInput.deviceId,
      (session) => rebootDevice(session),
      { timeoutSeconds: 15 },
    );

    return { success: true };
  });
