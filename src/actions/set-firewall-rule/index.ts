"use server";

import { actionClient } from "@/lib/next-safe-action";
import { withDeviceSession } from "@/lib/mikrotik/with-device-session";
import { setFirewallRuleDisabled } from "@/services/mikrotik/firewall";
import { setFirewallRuleSchema } from "./schema";

export const setFirewallRuleAction = actionClient
  .schema(setFirewallRuleSchema)
  .action(async ({ parsedInput }) => {
    const path =
      parsedInput.ruleType === "nat"
        ? "/ip/firewall/nat"
        : "/ip/firewall/filter";

    await withDeviceSession(parsedInput.deviceId, (session) =>
      setFirewallRuleDisabled(
        session,
        path,
        parsedInput.ruleId,
        parsedInput.disabled,
      ),
    );

    return { success: true };
  });
