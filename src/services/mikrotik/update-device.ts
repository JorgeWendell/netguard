import { eq } from "drizzle-orm";

import { db } from "@/db/index";
import { mikrotikDevicesTable } from "@/db/schema";
import {
  persistOfflineDeviceData,
  persistOnlineDeviceData,
} from "@/lib/mikrotik/persist-online-data";
import { emitDashboardUpdate } from "@/lib/events/pg-notify";
import {
  getDeviceOnlineState,
  recordAvailabilityEventIfChanged,
} from "@/lib/events/record-availability-event";

import { collectDeviceData } from "./collect";
import type { UpdateDeviceOptions } from "./types";

type DeviceRow = {
  id: string;
  name: string;
  host: string;
  apiPort: number;
  apiSsl: boolean;
  username: string;
  password: string;
  active: boolean;
};

async function getDeviceById(deviceId: string): Promise<DeviceRow | null> {
  const [device] = await db
    .select({
      id: mikrotikDevicesTable.id,
      name: mikrotikDevicesTable.name,
      host: mikrotikDevicesTable.host,
      apiPort: mikrotikDevicesTable.apiPort,
      apiSsl: mikrotikDevicesTable.apiSsl,
      username: mikrotikDevicesTable.username,
      password: mikrotikDevicesTable.password,
      active: mikrotikDevicesTable.active,
    })
    .from(mikrotikDevicesTable)
    .where(eq(mikrotikDevicesTable.id, deviceId))
    .limit(1);

  return device ?? null;
}

export async function updateMikrotikDevice(
  deviceId: string,
  options: UpdateDeviceOptions = {},
) {
  const { recordMetrics = false } = options;
  const device = await getDeviceById(deviceId);

  if (!device) {
    return {
      success: false,
      online: false,
      error: "Equipamento não encontrado",
    };
  }

  if (!device.active) {
    return {
      success: false,
      online: false,
      error: "Equipamento inativo",
    };
  }

  const previousOnline = await getDeviceOnlineState(deviceId);

  const result = await collectDeviceData({
    host: device.host,
    apiPort: device.apiPort,
    apiSsl: device.apiSsl,
    username: device.username,
    password: device.password,
  }, {
    checkUpdates: recordMetrics,
  });

  if (result.online) {
    await persistOnlineDeviceData(deviceId, result, { recordMetrics });
  } else {
    await persistOfflineDeviceData(deviceId, result);
  }

  try {
    await recordAvailabilityEventIfChanged(
      deviceId,
      previousOnline,
      result.online,
      device.name,
    );
  } catch (error) {
    console.error(
      `[Events] Falha ao registrar evento de ${device.name}:`,
      error,
    );
  }

  await emitDashboardUpdate({
    type: "stats_updated",
    source: "device_update",
    deviceId,
    online: result.online,
  });

  if (!result.online) {
    return {
      success: false,
      online: false,
      latencyMs: result.latencyMs,
      error: result.error ?? "Não foi possível conectar ao equipamento",
    };
  }

  return {
    success: true,
    online: true,
    latencyMs: result.latencyMs,
    identity: result.identity,
    routerOsVersion: result.routerOsVersion,
    cpuUsage: result.cpuUsage,
    memoryUsage: result.memoryUsage,
    recordMetrics,
  };
}
