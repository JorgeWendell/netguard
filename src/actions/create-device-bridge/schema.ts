import { z } from "zod";

export const createDeviceBridgeSchema = z.object({
  deviceId: z.string().uuid(),
  name: z
    .string()
    .min(1, "Informe o nome da bridge")
    .max(64, "Nome muito longo")
    .regex(/^[a-zA-Z0-9_-]+$/, "Use apenas letras, números, _ e -"),
  comment: z.string().max(255).optional(),
  vlanFiltering: z.boolean().optional(),
});
