import { z } from "zod";

export const exportMikrotikConfigSchema = z.object({
  deviceId: z.string().uuid(),
});
