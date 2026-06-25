import { z } from "zod";

export const updateDeviceNtpSchema = z.object({
  deviceId: z.string().uuid(),
  enabled: z.boolean(),
  servers: z.string(),
});
