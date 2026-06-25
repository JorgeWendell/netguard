"use server";

import { actionClient } from "@/lib/next-safe-action";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import { createRoute } from "@/services/mikrotik/routes";
import { createDeviceRouteSchema } from "./schema";

export const createDeviceRouteAction = actionClient
  .schema(createDeviceRouteSchema)
  .action(async ({ parsedInput }) => {
    const {
      deviceId,
      checkGateway,
      gateway,
      interface: iface,
      routingTable,
      prefSrc,
      comment,
      ...rest
    } = parsedInput;

    await withDeviceSession(deviceId, (session) =>
      createRoute(session, {
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
