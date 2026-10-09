"use server";

import { eq } from "drizzle-orm";

import { db } from "@/db/index";
import { dvrsTable, locationsTable } from "@/db/schema";
import { encryptDvrPassword } from "@/lib/dvr/crypto";
import { findDuplicateDvrError } from "@/lib/dvr/find-duplicate-dvr";
import { actionClient } from "@/lib/next-safe-action";

import { updateDvrSchema } from "./schema";

export const updateDvrAction = actionClient
  .schema(updateDvrSchema)
  .action(async ({ parsedInput }) => {
    const [location] = await db
      .select({ id: locationsTable.id })
      .from(locationsTable)
      .where(eq(locationsTable.id, parsedInput.locationId))
      .limit(1);

    if (!location) {
      return { success: false, error: "Local não encontrado" };
    }

    const [existing] = await db
      .select({ id: dvrsTable.id })
      .from(dvrsTable)
      .where(eq(dvrsTable.id, parsedInput.id))
      .limit(1);

    if (!existing) {
      return { success: false, error: "DVR não encontrado" };
    }

    const duplicateError = await findDuplicateDvrError({
      serialNumber: parsedInput.serialNumber,
      ddns: parsedInput.ddns,
      ip: parsedInput.ip,
      httpPort: parsedInput.httpPort,
      excludeId: parsedInput.id,
    });

    if (duplicateError) {
      return { success: false, error: duplicateError };
    }

    await db
      .update(dvrsTable)
      .set({
        locationId: parsedInput.locationId,
        name: parsedInput.name,
        serialNumber: parsedInput.serialNumber,
        ddns: parsedInput.ddns || null,
        ip: parsedInput.ip || null,
        httpPort: parsedInput.httpPort,
        rtspPort: parsedInput.rtspPort,
        username: parsedInput.username,
        ...(parsedInput.password
          ? { passwordEncrypted: encryptDvrPassword(parsedInput.password) }
          : {}),
        active: parsedInput.active,
        notes: parsedInput.notes || null,
      })
      .where(eq(dvrsTable.id, parsedInput.id));

    return { success: true };
  });
