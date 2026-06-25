"use server";

import { actionClient } from "@/lib/next-safe-action";
import { pollAndPersistDevice } from "@/lib/mikrotik/poll-device";
import { connectMikrotikDeviceSchema } from "./schema";

export const connectMikrotikDeviceAction = actionClient
  .schema(connectMikrotikDeviceSchema)
  .action(async ({ parsedInput }) => {
    return pollAndPersistDevice(parsedInput.id);
  });
