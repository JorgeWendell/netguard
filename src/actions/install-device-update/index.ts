"use server";

import { actionClient } from "@/lib/next-safe-action";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import { installPackageUpdate } from "@/services/mikrotik/system-update";
import { deviceUpdateDeviceIdSchema } from "@/actions/device-update/schema";

export const installDeviceUpdateAction = actionClient
  .schema(deviceUpdateDeviceIdSchema)
  .action(async ({ parsedInput }) => {
    const update = await withDeviceSession(
      parsedInput.deviceId,
      (session) => installPackageUpdate(session),
      { timeoutSeconds: 120 },
    );

    return { success: true, update };
  });
