import { and, desc, eq, gte, lte } from "drizzle-orm";

import { db } from "@/db/index";
import {
  companiesTable,
  locationsTable,
  mikrotikAvailabilityEventsTable,
  mikrotikDevicesTable,
} from "@/db/schema";

export type AvailabilityEventRow = {
  id: string;
  deviceId: string;
  deviceName: string;
  companyName: string;
  locationName: string;
  host: string;
  eventType: "online" | "offline";
  message: string | null;
  createdAt: Date;
};

export type AvailabilityEventsFilters = {
  limit?: number;
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

export async function getAvailabilityEvents(
  filters: AvailabilityEventsFilters = {},
): Promise<AvailabilityEventRow[]> {
  const { limit = 200, deviceId, companyId, locationId, dateFrom, dateTo } =
    filters;

  const conditions = [];

  if (deviceId) {
    conditions.push(eq(mikrotikAvailabilityEventsTable.deviceId, deviceId));
  }

  if (companyId) {
    conditions.push(eq(companiesTable.id, companyId));
  }

  if (locationId) {
    conditions.push(eq(locationsTable.id, locationId));
  }

  if (dateFrom) {
    conditions.push(
      gte(mikrotikAvailabilityEventsTable.createdAt, parseDateStart(dateFrom)),
    );
  }

  if (dateTo) {
    conditions.push(
      lte(mikrotikAvailabilityEventsTable.createdAt, parseDateEnd(dateTo)),
    );
  }

  const query = db
    .select({
      id: mikrotikAvailabilityEventsTable.id,
      deviceId: mikrotikAvailabilityEventsTable.deviceId,
      deviceName: mikrotikDevicesTable.name,
      companyName: companiesTable.name,
      locationName: locationsTable.name,
      host: mikrotikDevicesTable.host,
      eventType: mikrotikAvailabilityEventsTable.eventType,
      message: mikrotikAvailabilityEventsTable.message,
      createdAt: mikrotikAvailabilityEventsTable.createdAt,
    })
    .from(mikrotikAvailabilityEventsTable)
    .innerJoin(
      mikrotikDevicesTable,
      eq(mikrotikAvailabilityEventsTable.deviceId, mikrotikDevicesTable.id),
    )
    .innerJoin(
      locationsTable,
      eq(mikrotikDevicesTable.locationId, locationsTable.id),
    )
    .innerJoin(
      companiesTable,
      eq(locationsTable.companyId, companiesTable.id),
    )
    .orderBy(desc(mikrotikAvailabilityEventsTable.createdAt))
    .limit(limit);

  if (conditions.length > 0) {
    return query.where(and(...conditions));
  }

  return query;
}
