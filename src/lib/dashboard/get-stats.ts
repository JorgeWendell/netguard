import { and, count, eq, gte, like, or, sql } from "drizzle-orm";

import { db } from "@/db/index";
import {
  companiesTable,
  locationsTable,
  mikrotikDevicesTable,
  mikrotikServicesTable,
  mikrotikStatusTable,
  mikrotikSystemInfoTable,
} from "@/db/schema";

export type DashboardStats = {
  online: number;
  offline: number;
  alerts: number;
  vpnActive: number;
  pendingUpdates: number;
  companies: number;
  locations: number;
  mikrotiks: number;
  updatedAt: string;
};

const CPU_ALERT_THRESHOLD = 80;
const MEMORY_ALERT_THRESHOLD = 85;

export async function getDashboardStats(): Promise<DashboardStats> {
  const activeDeviceFilter = eq(mikrotikDevicesTable.active, true);

  const [[onlineRow], [offlineRow], [mikrotikRow]] = await Promise.all([
    db
      .select({ value: count() })
      .from(mikrotikDevicesTable)
      .where(and(activeDeviceFilter, eq(mikrotikDevicesTable.online, true))),
    db
      .select({ value: count() })
      .from(mikrotikDevicesTable)
      .where(and(activeDeviceFilter, eq(mikrotikDevicesTable.online, false))),
    db
      .select({ value: count() })
      .from(mikrotikDevicesTable)
      .where(activeDeviceFilter),
  ]);

  const [[companyRow], [locationRow], [alertRow], [vpnRow], [updatesRow]] =
    await Promise.all([
      db
        .select({ value: count() })
        .from(companiesTable)
        .where(eq(companiesTable.active, true)),
      db
        .select({ value: count() })
        .from(locationsTable)
        .where(eq(locationsTable.active, true)),
      db
        .select({ value: count() })
        .from(mikrotikDevicesTable)
        .leftJoin(
          mikrotikStatusTable,
          eq(mikrotikDevicesTable.id, mikrotikStatusTable.deviceId),
        )
        .where(
          and(
            eq(mikrotikDevicesTable.active, true),
            eq(mikrotikDevicesTable.monitoringEnabled, true),
            eq(mikrotikDevicesTable.alertsEnabled, true),
            or(
              eq(mikrotikDevicesTable.online, false),
              gte(mikrotikStatusTable.cpuUsage, CPU_ALERT_THRESHOLD),
              gte(mikrotikStatusTable.memoryUsage, MEMORY_ALERT_THRESHOLD),
            ),
          ),
        ),
      db
        .select({
          value: sql<number>`count(distinct ${mikrotikServicesTable.deviceId})`,
        })
        .from(mikrotikServicesTable)
        .innerJoin(
          mikrotikDevicesTable,
          eq(mikrotikServicesTable.deviceId, mikrotikDevicesTable.id),
        )
        .where(
          and(
            activeDeviceFilter,
            eq(mikrotikDevicesTable.online, true),
            eq(mikrotikServicesTable.running, true),
            like(mikrotikServicesTable.service, "openvpn-client:%"),
          ),
        ),
      db
        .select({ value: count() })
        .from(mikrotikSystemInfoTable)
        .innerJoin(
          mikrotikDevicesTable,
          eq(mikrotikSystemInfoTable.deviceId, mikrotikDevicesTable.id),
        )
        .where(
          and(
            activeDeviceFilter,
            eq(mikrotikDevicesTable.online, true),
            or(
              eq(mikrotikSystemInfoTable.routerOsUpdatePending, true),
              eq(mikrotikSystemInfoTable.routerboardUpdatePending, true),
            ),
          ),
        ),
    ]);

  return {
    online: onlineRow?.value ?? 0,
    offline: offlineRow?.value ?? 0,
    alerts: alertRow?.value ?? 0,
    vpnActive: Number(vpnRow?.value ?? 0),
    pendingUpdates: updatesRow?.value ?? 0,
    companies: companyRow?.value ?? 0,
    locations: locationRow?.value ?? 0,
    mikrotiks: mikrotikRow?.value ?? 0,
    updatedAt: new Date().toISOString(),
  };
}
