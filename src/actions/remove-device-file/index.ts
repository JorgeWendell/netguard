"use server";

import { actionClient } from "@/lib/next-safe-action";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import { removeDeviceFile } from "@/services/mikrotik/files";
import { removeDeviceFileSchema } from "./schema";

export const removeDeviceFileAction = actionClient
  .schema(removeDeviceFileSchema)
  .action(async ({ parsedInput }) => {
    await withDeviceSession(parsedInput.deviceId, (session) =>
      removeDeviceFile(session, parsedInput.fileName),
    );

    return { success: true };
  });
