"use server";

import { actionClient } from "@/lib/next-safe-action";
import { getDeviceServices } from "@/lib/services/get-device-services";
import { getDeviceServicesSchema } from "./schema";

export const getDeviceServicesAction = actionClient
  .schema(getDeviceServicesSchema)
  .action(async ({ parsedInput }) => {
    const data = await getDeviceServices(parsedInput);

    return {
      success: true,
      data,
      updatedAt: new Date().toISOString(),
    };
  });
