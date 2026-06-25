"use server";

import { actionClient } from "@/lib/next-safe-action";
import { db } from "@/db/index";
import { verificationsTable, usersTable, accountsTable } from "@/db/schema";
import { completeSignupSchema } from "./schema";
import { eq, and, gt } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const completeSignupAction = actionClient
  .schema(completeSignupSchema)
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

    const existingAccount = await db
      .select()
      .from(accountsTable)
      .where(
        and(
          eq(accountsTable.userId, user[0].id),
          eq(accountsTable.providerId, "credential")
        )
      )
      .limit(1);

    const authHeaders = await headers();
    
    try {
      if (existingAccount.length === 0) {
        const tempEmail = `temp-${Date.now()}@temp.local`;
        const signupResult = await auth.api.signUpEmail({
          headers: authHeaders,
          body: {
            email: tempEmail,
            password: parsedInput.password,
            name: "temp",
          },
        });

        if (signupResult?.user) {
          const tempAccount = await db
            .select()
            .from(accountsTable)
            .where(eq(accountsTable.userId, signupResult.user.id))
            .limit(1);

          if (tempAccount.length > 0) {
            await db
              .update(accountsTable)
              .set({
                userId: user[0].id,
                accountId: user[0].email,
              })
              .where(eq(accountsTable.id, tempAccount[0].id));
          }

          await db.delete(usersTable).where(eq(usersTable.id, signupResult.user.id));
        }
      } else {
        // Conta de credenciais já existe; mantemos a senha atual.
      }
    } catch (error) {
      console.error("Erro ao definir senha:", error);
      return { success: false, error: "Erro ao definir senha" };
    }

    await db
      .update(usersTable)
      .set({
        emailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, user[0].id));

    await db
      .delete(verificationsTable)
      .where(eq(verificationsTable.id, verification[0].id));

    return { success: true };
  });
