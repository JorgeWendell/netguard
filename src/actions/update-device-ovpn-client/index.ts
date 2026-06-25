"use server";

import { actionClient } from "@/lib/next-safe-action";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import { updateOpenVpnClient } from "@/services/mikrotik/openvpn";
import { updateDeviceOvpnClientSchema } from "../create-device-ovpn-client/schema";

export const updateDeviceOvpnClientAction = actionClient
  .schema(updateDeviceOvpnClientSchema)
  .action(async ({ parsedInput }) => {
    const { deviceId, clientId, ...input } = parsedInput;

    await withDeviceSession(deviceId, (session) =>
      updateOpenVpnClient(session, {
        clientId,
        ...input,
      }),
    );

    return { success: true };
  });
