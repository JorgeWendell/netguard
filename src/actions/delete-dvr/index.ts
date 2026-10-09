"use server";

import { eq } from "drizzle-orm";

import { db } from "@/db/index";
import { dvrsTable } from "@/db/schema";
import { actionClient } from "@/lib/next-safe-action";

import { deleteDvrSchema } from "./schema";

export const deleteDvrAction = actionClient
  .schema(deleteDvrSchema)
  .action(async ({ parsedInput }) => {
    await db.delete(dvrsTable).where(eq(dvrsTable.id, parsedInput.id));

    return { success: true };
  });
