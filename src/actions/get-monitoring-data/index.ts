"use server";

import { actionClient } from "@/lib/next-safe-action";
import { getMonitoringData } from "@/lib/monitoring/get-monitoring-data";
import { getMonitoringDataSchema } from "./schema";

export const getMonitoringDataAction = actionClient
  .schema(getMonitoringDataSchema)
  .action(async () => {
    const data = await getMonitoringData();
    return {
      success: true,
      data,
      updatedAt: new Date().toISOString(),
    };
  });
