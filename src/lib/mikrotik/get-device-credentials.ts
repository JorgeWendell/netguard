import { eq } from "drizzle-orm";

import { db } from "@/db/index";
import { mikrotikDevicesTable } from "@/db/schema";
import type { MikrotikDeviceCredentials } from "@/services/mikrotik/types";

export type DeviceCredentials = MikrotikDeviceCredentials & {
  id: string;
  name: string;
};

export async function getDeviceCredentials(
  deviceId: string,
): Promise<DeviceCredentials | null> {
  const [device] = await db
    .select({
      id: mikrotikDevicesTable.id,
      name: mikrotikDevicesTable.name,
      host: mikrotikDevicesTable.host,
      apiPort: mikrotikDevicesTable.apiPort,
      apiSsl: mikrotikDevicesTable.apiSsl,
      username: mikrotikDevicesTable.username,
      password: mikrotikDevicesTable.password,
    })
    .from(mikrotikDevicesTable)
    .where(eq(mikrotikDevicesTable.id, deviceId))
    .limit(1);

  if (!device) {
    return null;
  }

  return device;
}
