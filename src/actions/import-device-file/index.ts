"use server";

import { actionClient } from "@/lib/next-safe-action";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import { importDeviceRsc } from "@/services/mikrotik/files";
import { importDeviceFileSchema } from "./schema";

export const importDeviceFileAction = actionClient
  .schema(importDeviceFileSchema)
  .action(async ({ parsedInput }) => {
    await withDeviceSession(
      parsedInput.deviceId,
      (session) => importDeviceRsc(session, parsedInput.fileName),
      { timeoutSeconds: 120 },
    );

    return { success: true };
  });
