import { z } from "zod";

export const getDvrsSchema = z.object({
  locationId: z.string().uuid().optional(),
});
