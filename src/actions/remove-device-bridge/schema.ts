import { z } from "zod";

export const removeDeviceBridgeSchema = z.object({
  deviceId: z.string().uuid(),
  bridgeId: z.string().min(1),
  bridgeName: z.string().min(1),
});
