import { z } from "zod";

export const syncDvrChannelsSchema = z.object({
  id: z.string().uuid(),
});
