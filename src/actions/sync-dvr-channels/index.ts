"use server";

import { syncDvrChannels } from "@/lib/dvr/sync-dvr";
import { actionClient } from "@/lib/next-safe-action";

import { syncDvrChannelsSchema } from "./schema";

export const syncDvrChannelsAction = actionClient
  .schema(syncDvrChannelsSchema)
  .action(async ({ parsedInput }) => syncDvrChannels(parsedInput.id));
