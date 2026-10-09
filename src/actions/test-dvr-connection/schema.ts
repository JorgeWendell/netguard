import { z } from "zod";

import {
  dvrConnectionFieldsSchema,
  dvrHostRequiredIssue,
  hasDvrHost,
} from "../create-dvr/schema";

export const testDvrConnectionSchema = dvrConnectionFieldsSchema
  .extend({
    id: z.string().uuid().optional(),
    password: z.string().optional(),
    serialNumber: z.string().trim().optional(),
  })
  .refine(hasDvrHost, dvrHostRequiredIssue);
