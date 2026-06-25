import { eq } from "drizzle-orm";

import { db } from "@/db/index";
import {
  mikrotikConfigSnapshotsTable,
  mikrotikDevicesTable,
} from "@/db/schema";

export async function persistConfigSnapshot(
  deviceId: string,
  config: string,
): Promise<{ id: string; createdAt: Date }> {
  const now = new Date();

  const [snapshot] = await db
    .insert(mikrotikConfigSnapshotsTable)
    .values({
      deviceId,
      config,
      createdAt: now,
    })
    .returning({
      id: mikrotikConfigSnapshotsTable.id,
      createdAt: mikrotikConfigSnapshotsTable.createdAt,
    });

  await db
    .update(mikrotikDevicesTable)
    .set({ lastBackup: now, updatedAt: now })
    .where(eq(mikrotikDevicesTable.id, deviceId));

  return snapshot;
}
