"use server";

import { actionClient } from "@/lib/next-safe-action";
import { getDashboardStats } from "@/lib/dashboard/get-stats";
import { getDashboardStatsSchema } from "./schema";

export const getDashboardStatsAction = actionClient
  .schema(getDashboardStatsSchema)
  .action(async () => {
    const stats = await getDashboardStats();
    return { success: true, data: stats };
  });
