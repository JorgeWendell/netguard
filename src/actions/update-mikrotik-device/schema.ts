import { z } from "zod";

export const updateMikrotikDeviceSchema = z.object({
  id: z.string().uuid(),
  locationId: z.string().uuid("Selecione um local"),
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  description: z.string().optional().or(z.literal("")),
  host: z.string().min(1, "Informe o host ou IP"),
  apiPort: z.coerce
    .number()
    .int()
    .min(1, "Porta inválida")
    .max(65535, "Porta inválida"),
  apiSsl: z.boolean(),
  username: z.string().min(1, "Informe o usuário da API"),
  password: z
    .union([z.string().min(1, "A senha não pode ser vazia"), z.literal("")])
    .optional(),
  monitoringEnabled: z.boolean(),
  alertsEnabled: z.boolean(),
  backupEnabled: z.boolean(),
  pollInterval: z.coerce
    .number()
    .int()
    .min(30, "Intervalo mínimo de 30 segundos")
    .max(3600, "Intervalo máximo de 3600 segundos"),
  active: z.boolean(),
  notes: z.string().optional().or(z.literal("")),
});
