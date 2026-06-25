"use server";

import { actionClient } from "@/lib/next-safe-action";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import { createBridge } from "@/services/mikrotik/bridge";
import { createDeviceBridgeSchema } from "./schema";

export const createDeviceBridgeAction = actionClient
  .schema(createDeviceBridgeSchema)
  .action(async ({ parsedInput }) => {
    await withDeviceSession(parsedInput.deviceId, (session) =>
      createBridge(session, {
        name: parsedInput.name,
        comment: parsedInput.comment,
        vlanFiltering: parsedInput.vlanFiltering,
      }),
    );

    return { success: true };
  });
