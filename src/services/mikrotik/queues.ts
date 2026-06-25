import type { MikrotikRecord, MikrotikSession } from "./types";

export async function fetchQueueCount(session: MikrotikSession): Promise<number> {
  const queues = (await session
    .write("/queue/simple/print")
    .catch(() => [])) as MikrotikRecord[];

  return queues.length;
}
