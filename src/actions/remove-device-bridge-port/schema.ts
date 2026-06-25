import { z } from "zod";

export const removeDeviceBridgePortSchema = z.object({
  deviceId: z.string().uuid(),
  portId: z.string().min(1),
});
