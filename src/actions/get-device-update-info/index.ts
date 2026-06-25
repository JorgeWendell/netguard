"use server";

import { actionClient } from "@/lib/next-safe-action";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import { fetchSystemData } from "@/services/mikrotik/system";
import {
  fetchPackageUpdateInfo,
  fetchRouterboardInfo,
} from "@/services/mikrotik/system-update";
import { deviceUpdateDeviceIdSchema } from "@/actions/device-update/schema";

export const getDeviceUpdateInfoAction = actionClient
  .schema(deviceUpdateDeviceIdSchema)
  .action(async ({ parsedInput }) => {
    const result = await withDeviceSession(
      parsedInput.deviceId,
      async (session) => {
        const [update, routerboard, system] = await Promise.all([
          fetchPackageUpdateInfo(session),
          fetchRouterboardInfo(session),
          fetchSystemData(session),
        ]);

        return { update, routerboard, system };
      },
      { timeoutSeconds: 30 },
    );

    return { success: true, ...result };
  });
