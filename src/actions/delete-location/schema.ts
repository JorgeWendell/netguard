import { z } from "zod";

export const deleteLocationSchema = z.object({
  id: z.string().uuid(),
});
