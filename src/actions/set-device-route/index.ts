"use server";

import { actionClient } from "@/lib/next-safe-action";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import { setRouteDisabled } from "@/services/mikrotik/routes";
import { setDeviceRouteSchema } from "@/actions/create-device-route/schema";

export const setDeviceRouteAction = actionClient
  .schema(setDeviceRouteSchema)
  .action(async ({ parsedInput }) => {
    const { deviceId, routeId, disabled } = parsedInput;

    await withDeviceSession(deviceId, (session) =>
      setRouteDisabled(session, routeId, disabled),
    );

    return { success: true };
  });
