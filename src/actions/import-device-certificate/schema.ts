import { z } from "zod";

export const importDeviceCertificateSchema = z.object({
  deviceId: z.string().uuid(),
  name: z
    .string()
    .min(1, "Informe o nome do certificado")
    .max(64)
    .regex(/^[a-zA-Z0-9_.-]+$/, "Use apenas letras, números, ., _ e -"),
  certificateFileName: z.string().min(1, "Selecione o arquivo do certificado"),
  keyFileName: z.string().optional(),
  passphrase: z.string().max(128).optional(),
  trusted: z.boolean().optional(),
});

export const updateDeviceCertificateSchema = z.object({
  deviceId: z.string().uuid(),
  certificateId: z.string().min(1),
  trusted: z.boolean(),
});

export const removeDeviceCertificateSchema = z.object({
  deviceId: z.string().uuid(),
  certificateId: z.string().min(1),
});
