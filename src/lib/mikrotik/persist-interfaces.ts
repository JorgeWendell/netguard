import { and, eq, notInArray } from "drizzle-orm";

import { db } from "@/db/index";
import { mikrotikInterfacesTable } from "@/db/schema";
import type { MikrotikInterfaceData } from "@/services/mikrotik/types";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function persistDeviceInterfaces(
  tx: DbTransaction,
  deviceId: string,
  interfaces: MikrotikInterfaceData[],
  now: Date,
): Promise<void> {
  if (interfaces.length === 0) {
    return;
  }

  const interfaceIds = interfaces.map((iface) => iface.interfaceId);

  for (const iface of interfaces) {
    await tx
      .insert(mikrotikInterfacesTable)
      .values({
        deviceId,
        interfaceId: iface.interfaceId,
        name: iface.name,
        type: iface.type ?? null,
        macAddress: iface.macAddress ?? null,
        mtu: iface.mtu ?? null,
        actualMtu: iface.actualMtu ?? null,
        l2Mtu: iface.l2Mtu ?? null,
        speed: iface.speed ?? null,
        duplex: iface.duplex ?? null,
        running: iface.running,
        enabled: iface.enabled,
        rxBytes: iface.rxBytes ?? null,
        txBytes: iface.txBytes ?? null,
        rxPackets: iface.rxPackets ?? null,
        txPackets: iface.txPackets ?? null,
        rxErrors: iface.rxErrors ?? null,
        txErrors: iface.txErrors ?? null,
        comment: iface.comment ?? null,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          mikrotikInterfacesTable.deviceId,
          mikrotikInterfacesTable.interfaceId,
        ],
        set: {
          name: iface.name,
          type: iface.type ?? null,
          macAddress: iface.macAddress ?? null,
          mtu: iface.mtu ?? null,
          actualMtu: iface.actualMtu ?? null,
          l2Mtu: iface.l2Mtu ?? null,
          speed: iface.speed ?? null,
          duplex: iface.duplex ?? null,
          running: iface.running,
          enabled: iface.enabled,
          rxBytes: iface.rxBytes ?? null,
          txBytes: iface.txBytes ?? null,
          rxPackets: iface.rxPackets ?? null,
          txPackets: iface.txPackets ?? null,
          rxErrors: iface.rxErrors ?? null,
          txErrors: iface.txErrors ?? null,
          comment: iface.comment ?? null,
          updatedAt: now,
        },
      });
  }

  await tx
    .delete(mikrotikInterfacesTable)
    .where(
      and(
        eq(mikrotikInterfacesTable.deviceId, deviceId),
        notInArray(mikrotikInterfacesTable.interfaceId, interfaceIds),
      ),
    );
}
