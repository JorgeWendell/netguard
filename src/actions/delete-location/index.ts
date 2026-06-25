"use server";

import { actionClient } from "@/lib/next-safe-action";
import { db } from "@/db/index";
import { locationsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { deleteLocationSchema } from "./schema";

export const deleteLocationAction = actionClient
  .schema(deleteLocationSchema)
  .action(async ({ parsedInput }) => {
    await db
      .delete(locationsTable)
      .where(eq(locationsTable.id, parsedInput.id));

    return { success: true };
  });
