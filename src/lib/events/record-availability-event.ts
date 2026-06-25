import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db/index";
import {
  mikrotikAvailabilityEventsTable,
  mikrotikDevicesTable,
  mikrotikStatusTable,
} from "@/db/schema";

import { emitDashboardUpdate } from "./pg-notify";
import { formatDuration } from "./format-duration";

type AvailabilityEventType = "online" | "offline";

export async function recordAvailabilityEventIfChanged(
  deviceId: string,
  previousOnline: boolean,
  currentOnline: boolean,
  deviceName: string,
): Promise<void> {
  if (previousOnline === currentOnline) {
    return;
  }

  const eventType: AvailabilityEventType = currentOnline ? "online" : "offline";
  const now = new Date();
  let message: string;

  if (eventType === "offline") {
    message = `${deviceName} ficou offline`;
  } else {
    const [lastOffline] = await db
      .select({ createdAt: mikrotikAvailabilityEventsTable.createdAt })
      .from(mikrotikAvailabilityEventsTable)
      .where(
        and(
          eq(mikrotikAvailabilityEventsTable.deviceId, deviceId),
          eq(mikrotikAvailabilityEventsTable.eventType, "offline"),
        ),
      )
      .orderBy(desc(mikrotikAvailabilityEventsTable.createdAt))
      .limit(1);

    if (lastOffline) {
      const offlineMs = now.getTime() - new Date(lastOffline.createdAt).getTime();
      message = `${deviceName} voltou online após ${formatDuration(offlineMs)} offline`;
    } else {
      message = `${deviceName} voltou online`;
    }
  }

  await db.insert(mikrotikAvailabilityEventsTable).values({
    deviceId,
    eventType,
    message,
    createdAt: now,
  });

  console.log(
    `[Events] ${deviceName}: ${previousOnline ? "online" : "offline"} → ${currentOnline ? "online" : "offline"}`,
  );

  await emitDashboardUpdate({
    type: "events_updated",
    deviceId,
    eventType,
  });
}

/** Mesma regra do monitoramento: status atual ou fallback no device. */
export async function getDeviceOnlineState(deviceId: string): Promise<boolean> {
  const [row] = await db
    .select({
      deviceOnline: mikrotikDevicesTable.online,
      statusOnline: mikrotikStatusTable.online,
    })
    .from(mikrotikDevicesTable)
    .leftJoin(
      mikrotikStatusTable,
      eq(mikrotikDevicesTable.id, mikrotikStatusTable.deviceId),
    )
    .where(eq(mikrotikDevicesTable.id, deviceId))
    .limit(1);

  if (!row) return false;
  return row.statusOnline ?? row.deviceOnline;
}
