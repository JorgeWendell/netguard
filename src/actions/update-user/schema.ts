import { z } from "zod";

export const updateUserSchema = z.object({
  id: z.string().min(1, "ID é obrigatório"),
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  password: z
    .union([
      z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
      z.literal(""),
    ])
    .optional(),
  isActive: z.boolean(),
});
