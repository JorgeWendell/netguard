import { and, eq, notInArray } from "drizzle-orm";

import { db } from "@/db/index";
import { mikrotikWanTable } from "@/db/schema";
import type { MikrotikWanData } from "@/services/mikrotik/types";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function persistDeviceWans(
  tx: DbTransaction,
  deviceId: string,
  wans: MikrotikWanData[],
  now: Date,
): Promise<void> {
  if (wans.length === 0) {
    return;
  }

  const interfaceNames = wans.map((wan) => wan.interface);

  for (const wan of wans) {
    await tx
      .insert(mikrotikWanTable)
      .values({
        deviceId,
        interface: wan.interface,
        provider: wan.provider ?? null,
        gateway: wan.gateway ?? null,
        localIp: wan.localIp ?? null,
        publicIp: wan.publicIp ?? null,
        dns: wan.dns ?? null,
        online: wan.online,
        latencyMs: wan.latencyMs ?? null,
        packetLoss: wan.packetLoss ?? null,
        lastPingAt: now,
        priority: wan.priority ?? null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [mikrotikWanTable.deviceId, mikrotikWanTable.interface],
        set: {
          provider: wan.provider ?? null,
          gateway: wan.gateway ?? null,
          localIp: wan.localIp ?? null,
          publicIp: wan.publicIp ?? null,
          dns: wan.dns ?? null,
          online: wan.online,
          latencyMs: wan.latencyMs ?? null,
          packetLoss: wan.packetLoss ?? null,
          lastPingAt: now,
          priority: wan.priority ?? null,
          updatedAt: now,
        },
      });
  }

  await tx
    .delete(mikrotikWanTable)
    .where(
      and(
        eq(mikrotikWanTable.deviceId, deviceId),
        notInArray(mikrotikWanTable.interface, interfaceNames),
      ),
    );
}
