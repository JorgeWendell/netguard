"use server";

import { actionClient } from "@/lib/next-safe-action";
import { db } from "@/db/index";
import {
  companiesTable,
  locationsTable,
  mikrotikDevicesTable,
} from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getMikrotikDevicesSchema } from "./schema";

export const getMikrotikDevicesAction = actionClient
  .schema(getMikrotikDevicesSchema)
  .action(async ({ parsedInput }) => {
    const query = db
      .select({
        id: mikrotikDevicesTable.id,
        locationId: mikrotikDevicesTable.locationId,
        locationName: locationsTable.name,
        companyId: companiesTable.id,
        companyName: companiesTable.name,
        name: mikrotikDevicesTable.name,
        description: mikrotikDevicesTable.description,
        host: mikrotikDevicesTable.host,
        apiPort: mikrotikDevicesTable.apiPort,
        apiSsl: mikrotikDevicesTable.apiSsl,
        username: mikrotikDevicesTable.username,
        monitoringEnabled: mikrotikDevicesTable.monitoringEnabled,
        alertsEnabled: mikrotikDevicesTable.alertsEnabled,
        backupEnabled: mikrotikDevicesTable.backupEnabled,
        pollInterval: mikrotikDevicesTable.pollInterval,
        online: mikrotikDevicesTable.online,
        lastSeen: mikrotikDevicesTable.lastSeen,
        lastBackup: mikrotikDevicesTable.lastBackup,
        active: mikrotikDevicesTable.active,
        notes: mikrotikDevicesTable.notes,
        createdAt: mikrotikDevicesTable.createdAt,
        updatedAt: mikrotikDevicesTable.updatedAt,
      })
      .from(mikrotikDevicesTable)
      .innerJoin(
        locationsTable,
        eq(mikrotikDevicesTable.locationId, locationsTable.id),
      )
      .innerJoin(
        companiesTable,
        eq(locationsTable.companyId, companiesTable.id),
      )
      .orderBy(desc(mikrotikDevicesTable.createdAt));

    const devices = parsedInput.locationId
      ? await query.where(
          eq(mikrotikDevicesTable.locationId, parsedInput.locationId),
        )
      : await query;

    return { success: true, data: devices };
  });
