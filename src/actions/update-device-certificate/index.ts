"use server";

import { actionClient } from "@/lib/next-safe-action";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import { setCertificateTrusted } from "@/services/mikrotik/certificates";
import { updateDeviceCertificateSchema } from "../import-device-certificate/schema";

export const updateDeviceCertificateAction = actionClient
  .schema(updateDeviceCertificateSchema)
  .action(async ({ parsedInput }) => {
    await withDeviceSession(parsedInput.deviceId, (session) =>
      setCertificateTrusted(
        session,
        parsedInput.certificateId,
        parsedInput.trusted,
      ),
    );

    return { success: true };
  });
