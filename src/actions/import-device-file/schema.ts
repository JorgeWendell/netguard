import { z } from "zod";

export const importDeviceFileSchema = z.object({
  deviceId: z.string().uuid(),
  fileName: z.string().min(1).max(255),
});
