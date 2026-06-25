"use server";

import { actionClient } from "@/lib/next-safe-action";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import { updateBridge } from "@/services/mikrotik/bridge";
import { updateDeviceBridgeSchema } from "./schema";

export const updateDeviceBridgeAction = actionClient
  .schema(updateDeviceBridgeSchema)
  .action(async ({ parsedInput }) => {
    await withDeviceSession(parsedInput.deviceId, (session) =>
      updateBridge(session, {
        bridgeId: parsedInput.bridgeId,
        name: parsedInput.name,
        comment: parsedInput.comment,
        disabled: parsedInput.disabled,
        vlanFiltering: parsedInput.vlanFiltering,
      }),
    );

    return { success: true };
  });
