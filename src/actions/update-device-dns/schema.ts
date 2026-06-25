import { z } from "zod";

export const updateDeviceDnsSchema = z.object({
  deviceId: z.string().uuid(),
  servers: z.string().min(1, "Informe ao menos um servidor DNS"),
  allowRemoteRequests: z.boolean(),
});
