import { z } from "zod";

export const createMikrotikDeviceSchema = z.object({
  locationId: z.string().uuid("Selecione um local"),
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  description: z.string().optional().or(z.literal("")),
  host: z.string().min(1, "Informe o host ou IP"),
  apiPort: z.coerce
    .number()
    .int()
    .min(1, "Porta inválida")
    .max(65535, "Porta inválida")
    .default(8728),
  apiSsl: z.boolean().default(false),
  username: z.string().min(1, "Informe o usuário da API"),
  password: z.string().min(1, "Informe a senha da API"),
  monitoringEnabled: z.boolean().default(true),
  alertsEnabled: z.boolean().default(true),
  backupEnabled: z.boolean().default(true),
  pollInterval: z.coerce
    .number()
    .int()
    .min(30, "Intervalo mínimo de 30 segundos")
    .max(3600, "Intervalo máximo de 3600 segundos")
    .default(60),
  active: z.boolean().default(true),
  notes: z.string().optional().or(z.literal("")),
});
