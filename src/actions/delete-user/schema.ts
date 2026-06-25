import { z } from "zod";

export const deleteUserSchema = z.object({
  id: z.string().min(1, "ID é obrigatório"),
});
