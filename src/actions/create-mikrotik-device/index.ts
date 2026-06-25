"use server";

import { actionClient } from "@/lib/next-safe-action";
import { db } from "@/db/index";
import { locationsTable, mikrotikDevicesTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createMikrotikDeviceSchema } from "./schema";

export const createMikrotikDeviceAction = actionClient
  .schema(createMikrotikDeviceSchema)
  .action(async ({ parsedInput }) => {
    const [location] = await db
      .select({ id: locationsTable.id })
      .from(locationsTable)
      .where(eq(locationsTable.id, parsedInput.locationId))
      .limit(1);

    if (!location) {
      return { success: false, error: "Local não encontrado" };
    }

    const [device] = await db
      .insert(mikrotikDevicesTable)
      .values({
        locationId: parsedInput.locationId,
        name: parsedInput.name,
        description: parsedInput.description || null,
        host: parsedInput.host,
        apiPort: parsedInput.apiPort,
        apiSsl: parsedInput.apiSsl,
        username: parsedInput.username,
        password: parsedInput.password,
        monitoringEnabled: parsedInput.monitoringEnabled,
        alertsEnabled: parsedInput.alertsEnabled,
        backupEnabled: parsedInput.backupEnabled,
        pollInterval: parsedInput.pollInterval,
        active: parsedInput.active,
        notes: parsedInput.notes || null,
      })
      .returning({ id: mikrotikDevicesTable.id });

    return { success: true, id: device.id };
  });
