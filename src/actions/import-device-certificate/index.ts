"use server";

import { actionClient } from "@/lib/next-safe-action";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import { importCertificate } from "@/services/mikrotik/certificates";
import { importDeviceCertificateSchema } from "./schema";

export const importDeviceCertificateAction = actionClient
  .schema(importDeviceCertificateSchema)
  .action(async ({ parsedInput }) => {
    const { deviceId, ...input } = parsedInput;

    await withDeviceSession(deviceId, (session) =>
      importCertificate(session, input),
    );

    return { success: true };
  });
