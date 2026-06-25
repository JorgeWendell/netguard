import { z } from "zod";

export const deleteCompanySchema = z.object({
  id: z.string().uuid(),
});
