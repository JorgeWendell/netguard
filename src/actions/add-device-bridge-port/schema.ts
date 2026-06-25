import { z } from "zod";

export const addDeviceBridgePortSchema = z.object({
  deviceId: z.string().uuid(),
  bridgeName: z.string().min(1),
  interfaceName: z.string().min(1),
});
