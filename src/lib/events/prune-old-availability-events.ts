import { lt } from "drizzle-orm";

import { db } from "@/db/index";
import { mikrotikAvailabilityEventsTable } from "@/db/schema";

import { AVAILABILITY_EVENTS_RETENTION_DAYS } from "./constants";

export async function pruneOldAvailabilityEvents(): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - AVAILABILITY_EVENTS_RETENTION_DAYS);

  const deleted = await db
    .delete(mikrotikAvailabilityEventsTable)
    .where(lt(mikrotikAvailabilityEventsTable.createdAt, cutoff))
    .returning({ id: mikrotikAvailabilityEventsTable.id });

  return deleted.length;
}
