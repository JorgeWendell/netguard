import { and, asc, eq, gte, lte, notLike } from "drizzle-orm";

import { db } from "@/db/index";
import {
  companiesTable,
  locationsTable,
  mikrotikDevicesTable,
  mikrotikServicesTable,
} from "@/db/schema";

export type DeviceServiceRow = {
  id: string;
  deviceId: string;
  deviceName: string;
  companyName: string;
  locationName: string;
  host: string;
  service: string;
  description: string | null;
  status: string | null;
  enabled: boolean;
  running: boolean;
  lastCheck: Date | null;
};

export type DeviceServicesFilters = {
  deviceId?: string;
  companyId?: string;
  locationId?: string;
  dateFrom?: string;
  dateTo?: string;
};

function parseDateStart(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

function parseDateEnd(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999);
}

export async function getDeviceServices(
  filters: DeviceServicesFilters = {},
): Promise<DeviceServiceRow[]> {
  const { deviceId, companyId, locationId, dateFrom, dateTo } = filters;

  const conditions = [
    eq(mikrotikDevicesTable.active, true),
    notLike(mikrotikServicesTable.service, "ntp-client:%"),
  ];

  if (deviceId) {
    conditions.push(eq(mikrotikServicesTable.deviceId, deviceId));
  }

  if (companyId) {
    conditions.push(eq(companiesTable.id, companyId));
  }

  if (locationId) {
    conditions.push(eq(locationsTable.id, locationId));
  }

  if (dateFrom) {
    conditions.push(
      gte(mikrotikServicesTable.lastCheck, parseDateStart(dateFrom)),
    );
  }

  if (dateTo) {
    conditions.push(
      lte(mikrotikServicesTable.lastCheck, parseDateEnd(dateTo)),
    );
  }

  return db
    .select({
      id: mikrotikServicesTable.id,
      deviceId: mikrotikServicesTable.deviceId,
      deviceName: mikrotikDevicesTable.name,
      companyName: companiesTable.name,
      locationName: locationsTable.name,
      host: mikrotikDevicesTable.host,
      service: mikrotikServicesTable.service,
      description: mikrotikServicesTable.description,
      status: mikrotikServicesTable.status,
      enabled: mikrotikServicesTable.enabled,
      running: mikrotikServicesTable.running,
      lastCheck: mikrotikServicesTable.lastCheck,
    })
    .from(mikrotikServicesTable)
    .innerJoin(
      mikrotikDevicesTable,
      eq(mikrotikServicesTable.deviceId, mikrotikDevicesTable.id),
    )
    .innerJoin(
      locationsTable,
      eq(mikrotikDevicesTable.locationId, locationsTable.id),
    )
    .innerJoin(
      companiesTable,
      eq(locationsTable.companyId, companiesTable.id),
    )
    .where(and(...conditions))
    .orderBy(
      asc(companiesTable.name),
      asc(locationsTable.name),
      asc(mikrotikDevicesTable.name),
      asc(mikrotikServicesTable.service),
    );
}
