import { z } from "zod";

const optionalText = z.string().max(255).optional();

const natRuleActionSchema = z.enum([
  "masquerade",
  "dst-nat",
  "src-nat",
  "accept",
  "redirect",
]);

export const natRuleFieldsSchema = z.object({
  chain: z.enum(["srcnat", "dstnat"]),
  action: natRuleActionSchema,
  protocol: z.enum(["tcp", "udp", "tcp-udp", "icmp", ""]).optional(),
  srcAddress: optionalText,
  dstAddress: optionalText,
  srcPort: optionalText,
  dstPort: optionalText,
  inInterface: optionalText,
  outInterface: optionalText,
  toAddresses: optionalText,
  toPorts: optionalText,
  comment: z.string().max(255).optional(),
  disabled: z.boolean().optional(),
});

function validateNatToAddresses(
  data: z.infer<typeof natRuleFieldsSchema>,
  ctx: z.RefinementCtx,
) {
  if (
    (data.action === "dst-nat" || data.action === "src-nat") &&
    !data.toAddresses?.trim()
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Informe o endereço de destino (to-addresses)",
      path: ["toAddresses"],
    });
  }
}

export const createDeviceNatRuleSchema = natRuleFieldsSchema
  .extend({
    deviceId: z.string().uuid(),
  })
  .superRefine(validateNatToAddresses);

export const updateDeviceNatRuleSchema = natRuleFieldsSchema
  .extend({
    deviceId: z.string().uuid(),
    ruleId: z.string().min(1),
  })
  .superRefine(validateNatToAddresses);

export const removeDeviceNatRuleSchema = z.object({
  deviceId: z.string().uuid(),
  ruleId: z.string().min(1),
});
