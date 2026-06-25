"use server";

import { actionClient } from "@/lib/next-safe-action";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import { addBridgePort } from "@/services/mikrotik/bridge";
import { addDeviceBridgePortSchema } from "./schema";

export const addDeviceBridgePortAction = actionClient
  .schema(addDeviceBridgePortSchema)
  .action(async ({ parsedInput }) => {
    await withDeviceSession(parsedInput.deviceId, (session) =>
      addBridgePort(
        session,
        parsedInput.bridgeName,
        parsedInput.interfaceName,
      ),
    );

    return { success: true };
  });
