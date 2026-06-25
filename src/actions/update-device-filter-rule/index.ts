"use server";

import { actionClient } from "@/lib/next-safe-action";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import { updateFilterRule } from "@/services/mikrotik/firewall";
import { updateDeviceFilterRuleSchema } from "@/actions/create-device-filter-rule/schema";

export const updateDeviceFilterRuleAction = actionClient
  .schema(updateDeviceFilterRuleSchema)
  .action(async ({ parsedInput }) => {
    const { deviceId, ruleId, protocol, ...input } = parsedInput;

    await withDeviceSession(deviceId, (session) =>
      updateFilterRule(session, {
        ruleId,
        ...input,
        protocol: protocol || undefined,
      }),
    );

    return { success: true };
  });
