"use server";

import { actionClient } from "@/lib/next-safe-action";
import { db } from "@/db/index";
import { usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { deleteUserSchema } from "./schema";


export const deleteUserAction = actionClient
  .schema(deleteUserSchema)
  .action(async ({ parsedInput }) => {
    await db.delete(usersTable).where(eq(usersTable.id, parsedInput.id));

 

    return { success: true };
  });
