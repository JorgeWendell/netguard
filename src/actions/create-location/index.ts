"use server";

import { actionClient } from "@/lib/next-safe-action";
import { db } from "@/db/index";
import { companiesTable, locationsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createLocationSchema } from "./schema";

export const createLocationAction = actionClient
  .schema(createLocationSchema)
  .action(async ({ parsedInput }) => {
    const [company] = await db
      .select({ id: companiesTable.id })
      .from(companiesTable)
      .where(eq(companiesTable.id, parsedInput.companyId))
      .limit(1);

    if (!company) {
      return { success: false, error: "Empresa não encontrada" };
    }

    const [location] = await db
      .insert(locationsTable)
      .values({
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
      .returning({ id: locationsTable.id });

    return { success: true, id: location.id };
  });
