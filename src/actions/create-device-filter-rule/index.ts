"use server";

import { actionClient } from "@/lib/next-safe-action";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import { createFilterRule } from "@/services/mikrotik/firewall";
import { createDeviceFilterRuleSchema } from "./schema";

export const createDeviceFilterRuleAction = actionClient
  .schema(createDeviceFilterRuleSchema)
  .action(async ({ parsedInput }) => {
    const { deviceId, protocol, ...input } = parsedInput;

    await withDeviceSession(deviceId, (session) =>
      createFilterRule(session, {
        ...input,
        protocol: protocol || undefined,
      }),
    );

    return { success: true };
  });
