import { z } from "zod";

export const deleteDvrSchema = z.object({
  id: z.string().uuid(),
});
