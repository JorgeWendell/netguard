import { and, eq, notInArray } from "drizzle-orm";

import { db } from "@/db/index";
import { mikrotikServicesTable } from "@/db/schema";
import type { MikrotikServiceData } from "@/services/mikrotik/types";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function persistDeviceServices(
  tx: DbTransaction,
  deviceId: string,
  services: MikrotikServiceData[],
  now: Date,
): Promise<void> {
  if (services.length === 0) {
    return;
  }

  const serviceKeys = services.map((item) => item.service);

  for (const item of services) {
    await tx
      .insert(mikrotikServicesTable)
      .values({
        deviceId,
        service: item.service,
        description: item.description ?? null,
        status: item.status ?? null,
        enabled: item.enabled,
        running: item.running,
        version: item.version ?? null,
        publicIp: item.publicIp ?? null,
        localIp: item.localIp ?? null,
        interfaceName: item.interfaceName ?? null,
        lastCheck: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [mikrotikServicesTable.deviceId, mikrotikServicesTable.service],
        set: {
          description: item.description ?? null,
          status: item.status ?? null,
          enabled: item.enabled,
          running: item.running,
          version: item.version ?? null,
          publicIp: item.publicIp ?? null,
          localIp: item.localIp ?? null,
          interfaceName: item.interfaceName ?? null,
          lastCheck: now,
          updatedAt: now,
        },
      });
  }

  await tx
    .delete(mikrotikServicesTable)
    .where(
      and(
        eq(mikrotikServicesTable.deviceId, deviceId),
        notInArray(mikrotikServicesTable.service, serviceKeys),
      ),
    );
}
