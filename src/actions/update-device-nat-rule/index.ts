"use server";

import { actionClient } from "@/lib/next-safe-action";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import { updateNatRule } from "@/services/mikrotik/firewall";
import { updateDeviceNatRuleSchema } from "@/actions/create-device-nat-rule/schema";

export const updateDeviceNatRuleAction = actionClient
  .schema(updateDeviceNatRuleSchema)
  .action(async ({ parsedInput }) => {
    const { deviceId, ruleId, protocol, ...input } = parsedInput;

    await withDeviceSession(deviceId, (session) =>
      updateNatRule(session, {
        ruleId,
        ...input,
        protocol: protocol || undefined,
      }),
    );

    return { success: true };
  });
