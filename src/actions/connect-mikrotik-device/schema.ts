import { z } from "zod";

export const connectMikrotikDeviceSchema = z.object({
  id: z.string().uuid(),
});
