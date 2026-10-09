"use server";

import { eq } from "drizzle-orm";

import { db } from "@/db/index";
import { dvrsTable } from "@/db/schema";
import { decryptDvrPassword } from "@/lib/dvr/crypto";
import { probeDvr } from "@/lib/dvr/intelbras-client";
import { actionClient } from "@/lib/next-safe-action";

import { testDvrConnectionSchema } from "./schema";

async function resolvePassword(id: string | undefined, password?: string) {
  if (password) {
    return password;
  }

  if (!id) {
    return null;
  }

  const [stored] = await db
    .select({ passwordEncrypted: dvrsTable.passwordEncrypted })
    .from(dvrsTable)
    .where(eq(dvrsTable.id, id))
    .limit(1);

  return stored ? decryptDvrPassword(stored.passwordEncrypted) : null;
}

export const testDvrConnectionAction = actionClient
  .schema(testDvrConnectionSchema)
  .action(async ({ parsedInput }) => {
    const password = await resolvePassword(
      parsedInput.id,
      parsedInput.password,
    );

    if (!password) {
      return { success: false, error: "Informe a senha do DVR para testar" };
    }

    try {
      const result = await probeDvr({
        host: parsedInput.ddns || parsedInput.ip || "",
        httpPort: parsedInput.httpPort,
        username: parsedInput.username,
        password,
      });

      const serialMatches =
        !parsedInput.serialNumber ||
        !result.serialNumber ||
        parsedInput.serialNumber.toLowerCase() ===
          result.serialNumber.toLowerCase();

      return {
        success: true,
        model: result.model,
        serialNumber: result.serialNumber,
        serialMatches,
        channelCount: result.channels.length,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Erro ao conectar no DVR",
      };
    }
  });
