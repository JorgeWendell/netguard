import { z } from "zod";

import {
  dvrFieldsSchema,
  dvrHostRequiredIssue,
  hasDvrHost,
} from "../create-dvr/schema";

export const updateDvrSchema = dvrFieldsSchema
  .extend({
    id: z.string().uuid(),
    password: z
      .union([z.string().min(1, "A senha não pode ser vazia"), z.literal("")])
      .optional(),
  })
  .refine(hasDvrHost, dvrHostRequiredIssue);
