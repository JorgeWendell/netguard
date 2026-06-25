import { z } from "zod";

export const updateCompanySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  cnpj: z.string().optional().or(z.literal("")),
  contact: z.string().optional().or(z.literal("")),
  whatsapp: z.string().optional().or(z.literal("")),
  email: z
    .union([z.string().email("E-mail inválido"), z.literal("")])
    .optional(),
  active: z.boolean(),
  notes: z.string().optional().or(z.literal("")),
});
