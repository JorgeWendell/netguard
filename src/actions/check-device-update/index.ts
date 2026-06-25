"use server";

import { actionClient } from "@/lib/next-safe-action";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import { checkPackageUpdates } from "@/services/mikrotik/system-update";
import { deviceUpdateDeviceIdSchema } from "@/actions/device-update/schema";

export const checkDeviceUpdateAction = actionClient
  .schema(deviceUpdateDeviceIdSchema)
  .action(async ({ parsedInput }) => {
    const update = await withDeviceSession(
      parsedInput.deviceId,
      (session) => checkPackageUpdates(session),
      { timeoutSeconds: 60 },
    );

    return { success: true, update };
  });
