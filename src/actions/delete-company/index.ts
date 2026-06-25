"use server";

import { actionClient } from "@/lib/next-safe-action";
import { db } from "@/db/index";
import { companiesTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { deleteCompanySchema } from "./schema";

export const deleteCompanyAction = actionClient
  .schema(deleteCompanySchema)
  .action(async ({ parsedInput }) => {
    await db
      .delete(companiesTable)
      .where(eq(companiesTable.id, parsedInput.id));

    return { success: true };
  });
