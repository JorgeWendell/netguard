"use server";

import { actionClient } from "@/lib/next-safe-action";
import { db } from "@/db/index";
import { companiesTable, locationsTable } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getLocationsSchema } from "./schema";

export const getLocationsAction = actionClient
  .schema(getLocationsSchema)
  .action(async ({ parsedInput }) => {
    const query = db
      .select({
        id: locationsTable.id,
        companyId: locationsTable.companyId,
        companyName: companiesTable.name,
        name: locationsTable.name,
        contact: locationsTable.contact,
        phone: locationsTable.phone,
        address: locationsTable.address,
        number: locationsTable.number,
        district: locationsTable.district,
        city: locationsTable.city,
        state: locationsTable.state,
        zipCode: locationsTable.zipCode,
        active: locationsTable.active,
        notes: locationsTable.notes,
        createdAt: locationsTable.createdAt,
        updatedAt: locationsTable.updatedAt,
      })
      .from(locationsTable)
      .innerJoin(companiesTable, eq(locationsTable.companyId, companiesTable.id))
      .orderBy(desc(locationsTable.createdAt));

    const locations = parsedInput.companyId
      ? await query.where(eq(locationsTable.companyId, parsedInput.companyId))
      : await query;

    return { success: true, data: locations };
  });
