import { z } from "zod";

export const completeSignupSchema = z.object({
  token: z.string().min(1, "Token é obrigatório"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});
