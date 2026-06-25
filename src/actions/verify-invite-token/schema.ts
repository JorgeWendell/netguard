import { z } from "zod";

export const verifyInviteTokenSchema = z.object({
  token: z.string().min(1, "Token é obrigatório"),
});
