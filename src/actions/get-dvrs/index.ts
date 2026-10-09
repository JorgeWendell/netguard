"use server";

import { desc, eq } from "drizzle-orm";

import { db } from "@/db/index";
import { companiesTable, dvrsTable, locationsTable } from "@/db/schema";
import { actionClient } from "@/lib/next-safe-action";

import { getDvrsSchema } from "./schema";

export const getDvrsAction = actionClient
  .schema(getDvrsSchema)
  .action(async ({ parsedInput }) => {
    const query = db
      .select({
        id: dvrsTable.id,
        locationId: dvrsTable.locationId,
        locationName: locationsTable.name,
        companyName: companiesTable.name,
        name: dvrsTable.name,
        serialNumber: dvrsTable.serialNumber,
        ddns: dvrsTable.ddns,
        ip: dvrsTable.ip,
        httpPort: dvrsTable.httpPort,
        rtspPort: dvrsTable.rtspPort,
        username: dvrsTable.username,
        model: dvrsTable.model,
        channelCount: dvrsTable.channelCount,
        online: dvrsTable.online,
        lastSeen: dvrsTable.lastSeen,
        lastCheckAt: dvrsTable.lastCheckAt,
        lastError: dvrsTable.lastError,
        active: dvrsTable.active,
        notes: dvrsTable.notes,
        createdAt: dvrsTable.createdAt,
        updatedAt: dvrsTable.updatedAt,
      })
      .from(dvrsTable)
      .innerJoin(locationsTable, eq(dvrsTable.locationId, locationsTable.id))
      .innerJoin(
        companiesTable,
        eq(locationsTable.companyId, companiesTable.id),
      )
      .orderBy(desc(dvrsTable.createdAt));

    const dvrs = parsedInput.locationId
      ? await query.where(eq(dvrsTable.locationId, parsedInput.locationId))
      : await query;

    return { success: true, data: dvrs };
  });
