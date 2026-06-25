import { z } from "zod";

const ovpnNameSchema = z
  .string()
  .min(1, "Informe o nome da interface")
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/, "Use apenas letras, números, _ e -");

const ovpnFieldsSchema = {
  connectTo: z.string().min(1, "Informe o servidor"),
  port: z.string().max(8).optional(),
  mode: z.enum(["ip", "ethernet"]).optional(),
  user: z.string().max(64).optional(),
  password: z.string().max(128).optional(),
  profile: z.string().max(64).optional(),
  certificate: z.string().max(64).optional(),
  cipher: z.string().max(64).optional(),
  auth: z.string().max(64).optional(),
  comment: z.string().max(255).optional(),
  disabled: z.boolean().optional(),
  verifyServerCertificate: z.boolean().optional(),
  addDefaultRoute: z.boolean().optional(),
  routeNopull: z.boolean().optional(),
};

export const createDeviceOvpnClientSchema = z.object({
  deviceId: z.string().uuid(),
  name: ovpnNameSchema,
  ...ovpnFieldsSchema,
});

export const updateDeviceOvpnClientSchema = z.object({
  deviceId: z.string().uuid(),
  clientId: z.string().min(1),
  name: ovpnNameSchema.optional(),
  ...ovpnFieldsSchema,
});

export const removeDeviceOvpnClientSchema = z.object({
  deviceId: z.string().uuid(),
  clientId: z.string().min(1),
});
