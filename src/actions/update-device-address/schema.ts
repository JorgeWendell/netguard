import { z } from "zod";

export const updateDeviceAddressSchema = z.object({
  deviceId: z.string().uuid(),
  addressId: z.string().min(1),
  address: z.string().min(1, "Informe o endereço com máscara (ex: 192.168.1.1/24)"),
});
