import { z } from "zod";

export const removeDeviceFileSchema = z.object({
  deviceId: z.string().uuid(),
  fileName: z.string().min(1).max(255),
});
