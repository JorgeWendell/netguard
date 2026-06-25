"use server";

import { actionClient } from "@/lib/next-safe-action";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import { setPackageUpdateChannel, fetchPackageUpdateInfo } from "@/services/mikrotik/system-update";
import { setDeviceUpdateChannelSchema } from "@/actions/device-update/schema";

export const setDeviceUpdateChannelAction = actionClient
  .schema(setDeviceUpdateChannelSchema)
  .action(async ({ parsedInput }) => {
    const { deviceId, channel } = parsedInput;

    const update = await withDeviceSession(deviceId, async (session) => {
      await setPackageUpdateChannel(session, channel);
      return fetchPackageUpdateInfo(session);
    });

    return { success: true, update };
  });
