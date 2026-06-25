"use server";

import { actionClient } from "@/lib/next-safe-action";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import { createOpenVpnClient } from "@/services/mikrotik/openvpn";
import { createDeviceOvpnClientSchema } from "./schema";

export const createDeviceOvpnClientAction = actionClient
  .schema(createDeviceOvpnClientSchema)
  .action(async ({ parsedInput }) => {
    const { deviceId, ...input } = parsedInput;

    await withDeviceSession(deviceId, (session) =>
      createOpenVpnClient(session, input),
    );

    return { success: true };
  });
