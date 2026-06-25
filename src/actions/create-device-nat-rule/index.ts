"use server";

import { actionClient } from "@/lib/next-safe-action";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import { createNatRule } from "@/services/mikrotik/firewall";
import { createDeviceNatRuleSchema } from "./schema";

export const createDeviceNatRuleAction = actionClient
  .schema(createDeviceNatRuleSchema)
  .action(async ({ parsedInput }) => {
    const { deviceId, protocol, ...input } = parsedInput;

    await withDeviceSession(deviceId, (session) =>
      createNatRule(session, {
        ...input,
        protocol: protocol || undefined,
      }),
    );

    return { success: true };
  });
