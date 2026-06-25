import { z } from "zod";

export const updateLocationSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid("Selecione uma empresa"),
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  contact: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  number: z.string().optional().or(z.literal("")),
  district: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  state: z.string().max(2, "Use a sigla do estado").optional().or(z.literal("")),
  zipCode: z.string().optional().or(z.literal("")),
  active: z.boolean(),
  notes: z.string().optional().or(z.literal("")),
});
