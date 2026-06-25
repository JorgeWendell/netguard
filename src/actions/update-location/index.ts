"use server";

import { actionClient } from "@/lib/next-safe-action";
import { db } from "@/db/index";
import { companiesTable, locationsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { updateLocationSchema } from "./schema";

export const updateLocationAction = actionClient
  .schema(updateLocationSchema)
  .action(async ({ parsedInput }) => {
    const [company] = await db
      .select({ id: companiesTable.id })
      .from(companiesTable)
      .where(eq(companiesTable.id, parsedInput.companyId))
      .limit(1);

    if (!company) {
      return { success: false, error: "Empresa não encontrada" };
    }

    await db
      .update(locationsTable)
      .set({
        companyId: parsedInput.companyId,
        name: parsedInput.name,
        contact: parsedInput.contact || null,
        phone: parsedInput.phone || null,
        address: parsedInput.address || null,
        number: parsedInput.number || null,
        district: parsedInput.district || null,
        city: parsedInput.city || null,
        state: parsedInput.state || null,
        zipCode: parsedInput.zipCode || null,
        active: parsedInput.active,
        notes: parsedInput.notes || null,
      })
      .where(eq(locationsTable.id, parsedInput.id));

    return { success: true };
  });
