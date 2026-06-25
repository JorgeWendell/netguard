"use server";

import { actionClient } from "@/lib/next-safe-action";
import { db } from "@/db/index";
import { usersTable, accountsTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { updateUserSchema } from "./schema";
import { hashPassword } from "better-auth/crypto";


export const updateUserAction = actionClient
  .schema(updateUserSchema)
  .action(async ({ parsedInput }) => {
    await db
      .update(usersTable)
      .set({
        name: parsedInput.name,
        email: parsedInput.email,
        isActive: parsedInput.isActive,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, parsedInput.id));

    if (
      parsedInput.password !== undefined &&
      parsedInput.password !== "" &&
      parsedInput.password.length >= 6
    ) {
      const hashedPassword = await hashPassword(parsedInput.password);
      await db
        .update(accountsTable)
        .set({
          password: hashedPassword,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(accountsTable.userId, parsedInput.id),
            eq(accountsTable.providerId, "credential")
          )
        );
    }

   

    return { success: true };
  });
