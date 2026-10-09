"use server";

import { eq } from "drizzle-orm";

import { db } from "@/db/index";
import { dvrsTable, locationsTable } from "@/db/schema";
import { encryptDvrPassword } from "@/lib/dvr/crypto";
import { findDuplicateDvrError } from "@/lib/dvr/find-duplicate-dvr";
import { syncDvrChannels } from "@/lib/dvr/sync-dvr";
import { actionClient } from "@/lib/next-safe-action";

import { createDvrSchema } from "./schema";

export const createDvrAction = actionClient
  .schema(createDvrSchema)
  .action(async ({ parsedInput }) => {
    const [location] = await db
      .select({ id: locationsTable.id })
      .from(locationsTable)
      .where(eq(locationsTable.id, parsedInput.locationId))
      .limit(1);

    if (!location) {
      return { success: false, error: "Local não encontrado" };
    }

    const duplicateError = await findDuplicateDvrError({
      serialNumber: parsedInput.serialNumber,
      ddns: parsedInput.ddns,
      ip: parsedInput.ip,
      httpPort: parsedInput.httpPort,
    });

    if (duplicateError) {
      return { success: false, error: duplicateError };
    }

    const [dvr] = await db
      .insert(dvrsTable)
      .values({
        locationId: parsedInput.locationId,
        name: parsedInput.name,
        serialNumber: parsedInput.serialNumber,
        ddns: parsedInput.ddns || null,
        ip: parsedInput.ip || null,
        httpPort: parsedInput.httpPort,
        rtspPort: parsedInput.rtspPort,
        username: parsedInput.username,
        passwordEncrypted: encryptDvrPassword(parsedInput.password),
        active: parsedInput.active,
        notes: parsedInput.notes || null,
      })
      .returning({ id: dvrsTable.id });

    const sync = await syncDvrChannels(dvr.id);

    return {
      success: true,
      id: dvr.id,
      channelCount: sync.success ? sync.channelCount : 0,
      syncError: sync.success ? null : sync.error,
    };
  });
