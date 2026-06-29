"use server";

import { randomUUID } from "crypto";
import { actionClient } from "@/lib/next-safe-action";
import { db } from "@/db/index";
import { usersTable, accountsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createUserSchema } from "./schema";
import { hashPassword } from "better-auth/crypto";



export const createUserAction = actionClient
  .schema(createUserSchema)
  .action(async ({ parsedInput }) => {
    const now = new Date();
    const id = randomUUID();

    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, parsedInput.email))
      .limit(1);

    if (existing.length > 0) {
      return { success: false, error: "Este email já está em uso" };
    }

    const hashedPassword = await hashPassword(parsedInput.password);

    await db.insert(usersTable).values({
      id,
      name: parsedInput.name,
      email: parsedInput.email,
      emailVerified: true,
      isActive: parsedInput.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });

    await db.insert(accountsTable).values({
      id: randomUUID(),
      accountId: parsedInput.email,
      providerId: "credential",
      userId: id,
      password: hashedPassword,
      createdAt: now,
      updatedAt: now,
    });

   

    return { success: true, id };
  });
