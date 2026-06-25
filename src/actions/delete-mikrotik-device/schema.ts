import { z } from "zod";

export const deleteMikrotikDeviceSchema = z.object({
  id: z.string().uuid(),
});
