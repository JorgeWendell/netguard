import { z } from "zod";

const dateFilterSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida");

export const getReportDataSchema = z
  .object({
    companyId: z.string().uuid().optional(),
    locationId: z.string().uuid().optional(),
    deviceId: z.string().uuid().optional(),
    dateFrom: dateFilterSchema,
    dateTo: dateFilterSchema,
  })
  .refine((data) => data.dateFrom <= data.dateTo, {
    message: "A data inicial deve ser anterior ou igual à data final",
    path: ["dateTo"],
  });
