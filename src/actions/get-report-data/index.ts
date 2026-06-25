"use server";

import { actionClient } from "@/lib/next-safe-action";
import { getReportData } from "@/lib/reports/get-report-data";
import { getReportDataSchema } from "./schema";

export const getReportDataAction = actionClient
  .schema(getReportDataSchema)
  .action(async ({ parsedInput }) => {
    const data = await getReportData(parsedInput);

    return {
      success: true,
      data,
    };
  });
