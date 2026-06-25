import { z } from "zod";

export const updateDeviceBridgeSchema = z.object({
  deviceId: z.string().uuid(),
  bridgeId: z.string().min(1),
  name: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
  comment: z.string().max(255).optional(),
  disabled: z.boolean().optional(),
  vlanFiltering: z.boolean().optional(),
});
