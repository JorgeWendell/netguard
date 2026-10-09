import { and, eq, gt } from "drizzle-orm";

import { db } from "@/db/index";
import { dvrCamerasTable, dvrsTable } from "@/db/schema";

import { decryptDvrPassword } from "./crypto";
import { getDvrHost } from "./get-dvr-host";
import { probeDvr } from "./intelbras-client";

export type SyncDvrResult =
  | { success: true; channelCount: number; model: string | null }
  | { success: false; error: string };

async function markDvrOffline(dvrId: string, error: string) {
  await db
    .update(dvrsTable)
    .set({ online: false, lastCheckAt: new Date(), lastError: error })
    .where(eq(dvrsTable.id, dvrId));
}

export async function syncDvrChannels(dvrId: string): Promise<SyncDvrResult> {
  const [dvr] = await db
    .select()
    .from(dvrsTable)
    .where(eq(dvrsTable.id, dvrId))
    .limit(1);

  if (!dvr) {
    return { success: false, error: "DVR não encontrado" };
  }

  try {
    const result = await probeDvr({
      host: getDvrHost(dvr),
      httpPort: dvr.httpPort,
      username: dvr.username,
      password: decryptDvrPassword(dvr.passwordEncrypted),
    });

    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .insert(dvrCamerasTable)
        .values(
          result.channels.map((channel) => ({
            dvrId: dvr.id,
            channel: channel.channel,
            name: channel.name,
          })),
        )
        .onConflictDoNothing({
          target: [dvrCamerasTable.dvrId, dvrCamerasTable.channel],
        });

      await tx
        .delete(dvrCamerasTable)
        .where(
          and(
            eq(dvrCamerasTable.dvrId, dvr.id),
            gt(dvrCamerasTable.channel, result.channels.length),
          ),
        );

      await tx
        .update(dvrsTable)
        .set({
          model: result.model,
          channelCount: result.channels.length,
          online: true,
          lastSeen: now,
          lastCheckAt: now,
          lastError: null,
        })
        .where(eq(dvrsTable.id, dvr.id));
    });

    return {
      success: true,
      channelCount: result.channels.length,
      model: result.model,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao conectar no DVR";

    await markDvrOffline(dvr.id, message);

    return { success: false, error: message };
  }
}
