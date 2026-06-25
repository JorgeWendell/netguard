import { z } from "zod";

const optionalText = z.string().max(255).optional();

const filterRuleActionSchema = z.enum([
  "accept",
  "drop",
  "reject",
  "fasttrack-connection",
  "log",
  "jump",
  "return",
  "passthrough",
]);

export const filterRuleFieldsSchema = z.object({
  chain: z.enum(["input", "forward", "output"]),
  action: filterRuleActionSchema,
  protocol: z.enum(["tcp", "udp", "tcp-udp", "icmp", ""]).optional(),
  srcAddress: optionalText,
  dstAddress: optionalText,
  srcPort: optionalText,
  dstPort: optionalText,
  inInterface: optionalText,
  outInterface: optionalText,
  connectionState: optionalText,
  comment: z.string().max(255).optional(),
  disabled: z.boolean().optional(),
});

export const createDeviceFilterRuleSchema = filterRuleFieldsSchema.extend({
  deviceId: z.string().uuid(),
});

export const updateDeviceFilterRuleSchema = filterRuleFieldsSchema.extend({
  deviceId: z.string().uuid(),
  ruleId: z.string().min(1),
});

export const removeDeviceFilterRuleSchema = z.object({
  deviceId: z.string().uuid(),
  ruleId: z.string().min(1),
});
