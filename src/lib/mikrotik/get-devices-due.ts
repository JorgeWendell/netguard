import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db/index";
import { mikrotikDevicesTable, mikrotikMetricsTable } from "@/db/schema";

import { MIKROTIK_METRICS_INTERVAL_MS, MIKROTIK_STATUS_POLL_INTERVAL_MS } from "./constants";

export type DeviceDueForPoll = {
  id: string;
  pollInterval: number;
  lastSeen: Date | null;
  lastMetricAt: Date | null;
  dueStatus: boolean;
  dueMetrics: boolean;
};

export async function getDevicesDueForPoll(): Promise<DeviceDueForPoll[]> {
  const devices = await db
    .select({
      id: mikrotikDevicesTable.id,
      pollInterval: mikrotikDevicesTable.pollInterval,
      lastSeen: mikrotikDevicesTable.lastSeen,
    })
    .from(mikrotikDevicesTable)
    .where(
      and(
        eq(mikrotikDevicesTable.active, true),
        eq(mikrotikDevicesTable.monitoringEnabled, true),
      ),
    );

  if (devices.length === 0) {
    return [];
  }

  const lastMetrics = await db
    .select({
      deviceId: mikrotikMetricsTable.deviceId,
      lastMetricAt: sql<Date>`max(${mikrotikMetricsTable.createdAt})`.as(
        "last_metric_at",
      ),
    })
    .from(mikrotikMetricsTable)
    .groupBy(mikrotikMetricsTable.deviceId);

  const lastMetricMap = new Map(
    lastMetrics.map((row) => [row.deviceId, row.lastMetricAt]),
  );

  const now = Date.now();

  return devices
    .map((device) => {
      const lastMetricAt = lastMetricMap.get(device.id) ?? null;
      const dueStatus =
        !device.lastSeen ||
        now - new Date(device.lastSeen).getTime() >=
          MIKROTIK_STATUS_POLL_INTERVAL_MS;
      const dueMetrics =
        !lastMetricAt ||
        now - new Date(lastMetricAt).getTime() >= MIKROTIK_METRICS_INTERVAL_MS;

      return {
        ...device,
        lastMetricAt,
        dueStatus,
        dueMetrics,
      };
    })
    .filter((device) => device.dueStatus || device.dueMetrics);
}
