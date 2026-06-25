import { z } from "zod";

export const getMikrotikDevicesSchema = z.object({
  locationId: z.string().uuid().optional(),
});
