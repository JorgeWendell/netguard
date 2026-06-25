"use server";

import { actionClient } from "@/lib/next-safe-action";
import { getAvailabilityEvents } from "@/lib/events/get-availability-events";
import { getAvailabilityEventsSchema } from "./schema";

export const getAvailabilityEventsAction = actionClient
  .schema(getAvailabilityEventsSchema)
  .action(async ({ parsedInput }) => {
    const data = await getAvailabilityEvents(parsedInput);

    return {
      success: true,
      data,
      updatedAt: new Date().toISOString(),
    };
  });
