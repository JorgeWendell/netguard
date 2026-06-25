"use server";

import { actionClient } from "@/lib/next-safe-action";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import { removeBridge } from "@/services/mikrotik/bridge";
import { removeDeviceBridgeSchema } from "./schema";

export const removeDeviceBridgeAction = actionClient
  .schema(removeDeviceBridgeSchema)
  .action(async ({ parsedInput }) => {
    await withDeviceSession(parsedInput.deviceId, (session) =>
      removeBridge(
        session,
        parsedInput.bridgeId,
        parsedInput.bridgeName,
      ),
    );

    return { success: true };
  });
