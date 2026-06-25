"use server";

import { actionClient } from "@/lib/next-safe-action";
import { db } from "@/db/index";
import { usersTable } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getUsersSchema } from "./schema";

export const getUsersAction = actionClient
  .schema(getUsersSchema)
  .action(async () => {
    const users = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        isActive: usersTable.isActive,
        createdAt: usersTable.createdAt,
        updatedAt: usersTable.updatedAt,
      })
      .from(usersTable)

      .orderBy(desc(usersTable.createdAt));

    return { success: true, data: users };
  });
