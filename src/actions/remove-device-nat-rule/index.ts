"use server";

import { actionClient } from "@/lib/next-safe-action";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import { removeNatRule } from "@/services/mikrotik/firewall";
import { removeDeviceNatRuleSchema } from "@/actions/create-device-nat-rule/schema";

export const removeDeviceNatRuleAction = actionClient
  .schema(removeDeviceNatRuleSchema)
  .action(async ({ parsedInput }) => {
    const { deviceId, ruleId } = parsedInput;

    await withDeviceSession(deviceId, (session) =>
      removeNatRule(session, ruleId),
    );

    return { success: true };
  });
