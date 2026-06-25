"use server";

import { actionClient } from "@/lib/next-safe-action";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import { removeFilterRule } from "@/services/mikrotik/firewall";
import { removeDeviceFilterRuleSchema } from "@/actions/create-device-filter-rule/schema";

export const removeDeviceFilterRuleAction = actionClient
  .schema(removeDeviceFilterRuleSchema)
  .action(async ({ parsedInput }) => {
    const { deviceId, ruleId } = parsedInput;

    await withDeviceSession(deviceId, (session) =>
      removeFilterRule(session, ruleId),
    );

    return { success: true };
  });
