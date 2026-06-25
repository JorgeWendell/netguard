"use server";

import { actionClient } from "@/lib/next-safe-action";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import { upgradeRouterboardFirmware } from "@/services/mikrotik/system-update";
import { deviceUpdateDeviceIdSchema } from "@/actions/device-update/schema";

export const upgradeDeviceRouterboardAction = actionClient
  .schema(deviceUpdateDeviceIdSchema)
  .action(async ({ parsedInput }) => {
    const routerboard = await withDeviceSession(
      parsedInput.deviceId,
      (session) => upgradeRouterboardFirmware(session),
      { timeoutSeconds: 60 },
    );

    return { success: true, routerboard, needsReboot: true };
  });
