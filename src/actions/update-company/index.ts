"use server";

import { actionClient } from "@/lib/next-safe-action";
import { db } from "@/db/index";
import { companiesTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { updateCompanySchema } from "./schema";

export const updateCompanyAction = actionClient
  .schema(updateCompanySchema)
  .action(async ({ parsedInput }) => {
    await db
      .update(companiesTable)
      .set({
        name: parsedInput.name,
        cnpj: parsedInput.cnpj || null,
        contact: parsedInput.contact || null,
        whatsapp: parsedInput.whatsapp || null,
        email: parsedInput.email || null,
        active: parsedInput.active,
        notes: parsedInput.notes || null,
      })
      .where(eq(companiesTable.id, parsedInput.id));

    return { success: true };
  });
