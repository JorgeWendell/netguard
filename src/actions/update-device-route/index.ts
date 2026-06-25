"use server";

import { actionClient } from "@/lib/next-safe-action";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import { updateRoute } from "@/services/mikrotik/routes";
import { updateDeviceRouteSchema } from "@/actions/create-device-route/schema";

export const updateDeviceRouteAction = actionClient
  .schema(updateDeviceRouteSchema)
  .action(async ({ parsedInput }) => {
    const {
      deviceId,
      routeId,
      checkGateway,
      gateway,
      interface: iface,
      routingTable,
      prefSrc,
      comment,
      ...rest
    } = parsedInput;

    await withDeviceSession(deviceId, (session) =>
      updateRoute(session, {
        routeId,
        ...rest,
        gateway: gateway?.trim() || undefined,
        interface: iface?.trim() || undefined,
        routingTable: routingTable?.trim() || undefined,
        checkGateway: checkGateway || undefined,
        prefSrc: prefSrc?.trim() || undefined,
        comment: comment?.trim() || undefined,
      }),
    );

    return { success: true };
  });
