"use server";

import { actionClient } from "@/lib/next-safe-action";
import { db } from "@/db/index";
import { locationsTable, mikrotikDevicesTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { updateMikrotikDeviceSchema } from "./schema";

export const updateMikrotikDeviceAction = actionClient
  .schema(updateMikrotikDeviceSchema)
  .action(async ({ parsedInput }) => {
    const [location] = await db
      .select({ id: locationsTable.id })
      .from(locationsTable)
      .where(eq(locationsTable.id, parsedInput.locationId))
      .limit(1);

    if (!location) {
      return { success: false, error: "Local não encontrado" };
    }

    const [existing] = await db
      .select({ id: mikrotikDevicesTable.id })
      .from(mikrotikDevicesTable)
      .where(eq(mikrotikDevicesTable.id, parsedInput.id))
      .limit(1);

    if (!existing) {
      return { success: false, error: "Equipamento não encontrado" };
    }

    await db
      .update(mikrotikDevicesTable)
      .set({
        locationId: parsedInput.locationId,
        name: parsedInput.name,
        description: parsedInput.description || null,
        host: parsedInput.host,
        apiPort: parsedInput.apiPort,
        apiSsl: parsedInput.apiSsl,
        username: parsedInput.username,
        ...(parsedInput.password
          ? { password: parsedInput.password }
          : {}),
        monitoringEnabled: parsedInput.monitoringEnabled,
        alertsEnabled: parsedInput.alertsEnabled,
        backupEnabled: parsedInput.backupEnabled,
        pollInterval: parsedInput.pollInterval,
        active: parsedInput.active,
        notes: parsedInput.notes || null,
      })
      .where(eq(mikrotikDevicesTable.id, parsedInput.id));

    return { success: true };
  });
