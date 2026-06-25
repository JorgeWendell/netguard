"use server";

import { actionClient } from "@/lib/next-safe-action";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import { downloadPackageUpdate } from "@/services/mikrotik/system-update";
import { deviceUpdateDeviceIdSchema } from "@/actions/device-update/schema";

export const downloadDeviceUpdateAction = actionClient
  .schema(deviceUpdateDeviceIdSchema)
  .action(async ({ parsedInput }) => {
    const update = await withDeviceSession(
      parsedInput.deviceId,
      (session) => downloadPackageUpdate(session),
      { timeoutSeconds: 300 },
    );

    return { success: true, update };
  });
