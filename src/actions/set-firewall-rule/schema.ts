import { z } from "zod";

export const setFirewallRuleSchema = z.object({
  deviceId: z.string().uuid(),
  ruleId: z.string().min(1),
  ruleType: z.enum(["filter", "nat"]),
  disabled: z.boolean(),
});
