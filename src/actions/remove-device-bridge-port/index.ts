"use server";

import { actionClient } from "@/lib/next-safe-action";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import { removeBridgePort } from "@/services/mikrotik/bridge";
import { removeDeviceBridgePortSchema } from "./schema";

export const removeDeviceBridgePortAction = actionClient
  .schema(removeDeviceBridgePortSchema)
  .action(async ({ parsedInput }) => {
    await withDeviceSession(parsedInput.deviceId, (session) =>
      removeBridgePort(session, parsedInput.portId),
    );

    return { success: true };
  });
