import { z } from "zod";

const hostPattern = /^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$/;

const optionalHostSchema = z
  .string()
  .trim()
  .max(255, "Endereço muito longo")
  .regex(hostPattern, "Endereço inválido")
  .optional()
  .or(z.literal(""));

const portSchema = z.coerce
  .number()
  .int()
  .min(1, "Porta inválida")
  .max(65535, "Porta inválida");

export const dvrConnectionFieldsSchema = z.object({
  ddns: optionalHostSchema,
  ip: optionalHostSchema,
  httpPort: portSchema.default(80),
  username: z.string().trim().min(1, "Informe o usuário do DVR"),
});

export const dvrFieldsSchema = dvrConnectionFieldsSchema.extend({
  locationId: z.string().uuid("Selecione um local"),
  name: z.string().trim().min(3, "O nome deve ter pelo menos 3 caracteres"),
  serialNumber: z.string().trim().min(1, "Informe o número de série"),
  rtspPort: portSchema.default(554),
  active: z.boolean().default(true),
  notes: z.string().optional().or(z.literal("")),
});

export function hasDvrHost(data: { ddns?: string; ip?: string }) {
  return Boolean(data.ddns || data.ip);
}

export const dvrHostRequiredIssue = {
  message: "Informe o DDNS ou o IP do DVR",
  path: ["ddns"],
};

export const createDvrSchema = dvrFieldsSchema
  .extend({
    password: z.string().min(1, "Informe a senha do DVR"),
  })
  .refine(hasDvrHost, dvrHostRequiredIssue);
