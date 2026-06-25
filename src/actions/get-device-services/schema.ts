import { z } from "zod";

const dateFilterSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida")
  .optional();

export const getDeviceServicesSchema = z
  .object({
    deviceId: z.string().uuid().optional(),
    companyId: z.string().uuid().optional(),
    dateFrom: dateFilterSchema,
    dateTo: dateFilterSchema,
  })
  .refine(
    (data) => {
      if (!data.dateFrom || !data.dateTo) return true;
      return data.dateFrom <= data.dateTo;
    },
    { message: "A data inicial deve ser anterior à data final", path: ["dateTo"] },
  );
