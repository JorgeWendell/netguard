"use server";

import { actionClient } from "@/lib/next-safe-action";
import { db } from "@/db/index";
import { companiesTable } from "@/db/schema";
import { createCompanySchema } from "./schema";

export const createCompanyAction = actionClient
  .schema(createCompanySchema)
  .action(async ({ parsedInput }) => {
    const [company] = await db
      .insert(companiesTable)
      .values({
        name: parsedInput.name,
        cnpj: parsedInput.cnpj || null,
        contact: parsedInput.contact || null,
        whatsapp: parsedInput.whatsapp || null,
        email: parsedInput.email || null,
        active: parsedInput.active,
        notes: parsedInput.notes || null,
      })
      .returning({ id: companiesTable.id });

    return { success: true, id: company.id };
  });
