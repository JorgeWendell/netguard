"use server";

import { actionClient } from "@/lib/next-safe-action";
import { db } from "@/db/index";
import { mikrotikDevicesTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { deleteMikrotikDeviceSchema } from "./schema";

export const deleteMikrotikDeviceAction = actionClient
  .schema(deleteMikrotikDeviceSchema)
  .action(async ({ parsedInput }) => {
    await db
      .delete(mikrotikDevicesTable)
      .where(eq(mikrotikDevicesTable.id, parsedInput.id));

    return { success: true };
  });
