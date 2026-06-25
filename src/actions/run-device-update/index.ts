"use server";

import { actionClient } from "@/lib/next-safe-action";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import {
  checkPackageUpdates,
  downloadPackageUpdate,
  installPackageUpdate,
} from "@/services/mikrotik/system-update";
import { deviceUpdateDeviceIdSchema } from "@/actions/device-update/schema";

export const runDeviceUpdateAction = actionClient
  .schema(deviceUpdateDeviceIdSchema)
  .action(async ({ parsedInput }) => {
    const update = await withDeviceSession(
      parsedInput.deviceId,
      async (session) => {
        await checkPackageUpdates(session);
        await downloadPackageUpdate(session);
        return installPackageUpdate(session);
      },
      { timeoutSeconds: 360 },
    );

    return {
      success: true,
      update,
      needsReboot: true,
    };
  });
