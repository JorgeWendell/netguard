"use server";

import { actionClient } from "@/lib/next-safe-action";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import { removeCertificate } from "@/services/mikrotik/certificates";
import { removeDeviceCertificateSchema } from "../import-device-certificate/schema";

export const removeDeviceCertificateAction = actionClient
  .schema(removeDeviceCertificateSchema)
  .action(async ({ parsedInput }) => {
    await withDeviceSession(parsedInput.deviceId, (session) =>
      removeCertificate(session, parsedInput.certificateId),
    );

    return { success: true };
  });
