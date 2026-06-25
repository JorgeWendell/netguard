"use server";

import { actionClient } from "@/lib/next-safe-action";
import { db } from "@/db/index";
import { companiesTable } from "@/db/schema";
import { desc } from "drizzle-orm";
import { getCompaniesSchema } from "./schema";

export const getCompaniesAction = actionClient
  .schema(getCompaniesSchema)
  .action(async () => {
    const companies = await db
      .select()
      .from(companiesTable)
      .orderBy(desc(companiesTable.createdAt));

    return { success: true, data: companies };
  });
