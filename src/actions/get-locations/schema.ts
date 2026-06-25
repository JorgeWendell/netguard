import { z } from "zod";

export const getLocationsSchema = z.object({
  companyId: z.string().uuid().optional(),
});
