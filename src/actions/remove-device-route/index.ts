"use server";

import { actionClient } from "@/lib/next-safe-action";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import { removeRoute } from "@/services/mikrotik/routes";
import { removeDeviceRouteSchema } from "@/actions/create-device-route/schema";

export const removeDeviceRouteAction = actionClient
  .schema(removeDeviceRouteSchema)
  .action(async ({ parsedInput }) => {
    const { deviceId, routeId } = parsedInput;

    await withDeviceSession(deviceId, (session) =>
      removeRoute(session, routeId),
    );

    return { success: true };
  });
