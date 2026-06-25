"use server";

import { actionClient } from "@/lib/next-safe-action";
import { db } from "@/db/index";
import { verificationsTable, usersTable } from "@/db/schema";
import { verifyInviteTokenSchema } from "./schema";
import { eq, and, gt } from "drizzle-orm";

export const verifyInviteTokenAction = actionClient
  .schema(verifyInviteTokenSchema)
  .action(async ({ parsedInput }) => {
    const verification = await db
      .select()
      .from(verificationsTable)
      .where(
        and(
          eq(verificationsTable.value, parsedInput.token),
          gt(verificationsTable.expiresAt, new Date())
        )
      )
      .limit(1);

    if (verification.length === 0) {
      return { success: false, error: "Token inválido ou expirado" };
    }

    const user = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
      })
      .from(usersTable)
      .where(eq(usersTable.email, verification[0].identifier))
      .limit(1);

    if (user.length === 0) {
      return { success: false, error: "Usuário não encontrado" };
    }

    if (user[0].email !== verification[0].identifier) {
      return { success: false, error: "Token inválido" };
    }

    return {
      success: true,
      data: {
        userId: user[0].id,
        name: user[0].name,
        email: user[0].email,
      },
    };
  });
