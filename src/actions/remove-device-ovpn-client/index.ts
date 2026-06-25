"use server";

import { actionClient } from "@/lib/next-safe-action";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import { removeOpenVpnClient } from "@/services/mikrotik/openvpn";
import { removeDeviceOvpnClientSchema } from "../create-device-ovpn-client/schema";

export const removeDeviceOvpnClientAction = actionClient
  .schema(removeDeviceOvpnClientSchema)
  .action(async ({ parsedInput }) => {
    await withDeviceSession(parsedInput.deviceId, (session) =>
      removeOpenVpnClient(session, parsedInput.clientId),
    );

    return { success: true };
  });
