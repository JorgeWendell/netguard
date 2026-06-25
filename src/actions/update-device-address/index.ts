"use server";

import { actionClient } from "@/lib/next-safe-action";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import { updateDeviceAddress } from "@/services/mikrotik/access/update-address";
import { updateDeviceAddressSchema } from "./schema";

export const updateDeviceAddressAction = actionClient
  .schema(updateDeviceAddressSchema)
  .action(async ({ parsedInput }) => {
    await withDeviceSession(parsedInput.deviceId, (session) =>
      updateDeviceAddress(
        session,
        parsedInput.addressId,
        parsedInput.address,
      ),
    );

    return { success: true };
  });
