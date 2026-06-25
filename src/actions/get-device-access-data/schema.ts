import { z } from "zod";

export const getDeviceAccessDataSchema = z.object({
  deviceId: z.string().uuid(),
});
