import { eq } from "drizzle-orm";

import { db } from "@/db/index";
import {
  mikrotikDevicesTable,
  mikrotikMetricsTable,
  mikrotikStatusTable,
  mikrotikSystemInfoTable,
} from "@/db/schema";

import type { MikrotikPollResult } from "@/services/mikrotik/types";

import { persistDeviceInterfaces } from "./persist-interfaces";
import { persistDeviceServices } from "./persist-services";
import { persistDeviceWans, markDeviceWansOffline } from "./persist-wans";

type PersistOptions = {
  recordMetrics?: boolean;
};

/**
 * Quando o equipamento fica online, abastece:
 * - mikrotik_system_info (dados estáticos do hardware/OS)
 * - mikrotik_status (snapshot atual de saúde)
 * - mikrotik_interfaces (snapshot das interfaces)
 * - mikrotik_services (DHCP, OpenVPN client, etc.)
 * - mikrotik_wans (links WAN / rotas default)
 * - mikrotik_metrics (somente quando recordMetrics = true)
 */
export async function persistOnlineDeviceData(
  deviceId: string,
  result: MikrotikPollResult,
  options: PersistOptions = {},
): Promise<void> {
  const { recordMetrics = true } = options;
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(mikrotikDevicesTable)
      .set({
        online: true,
        lastSeen: now,
        updatedAt: now,
      })
      .where(eq(mikrotikDevicesTable.id, deviceId));

    await tx
      .insert(mikrotikSystemInfoTable)
      .values({
        deviceId,
        identity: result.identity ?? null,
        boardName: result.boardName ?? null,
        model: result.model ?? null,
        serialNumber: result.serialNumber ?? null,
        routerOsVersion: result.routerOsVersion ?? null,
        architecture: result.architecture ?? null,
        cpu: result.cpu ?? null,
        cpuCount: result.cpuCount ?? null,
        cpuFrequency: result.cpuFrequency ?? null,
        totalMemory: result.totalMemory ?? null,
        totalStorage: result.totalStorage ?? null,
        license: result.license ?? null,
        timezone: result.timezone ?? null,
        routerOsUpdatePending: result.routerOsUpdatePending ?? false,
        routerboardUpdatePending: result.routerboardUpdatePending ?? false,
        updateCheckedAt: recordMetrics ? now : undefined,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: mikrotikSystemInfoTable.deviceId,
        set: {
          identity: result.identity ?? null,
          boardName: result.boardName ?? null,
          model: result.model ?? null,
          serialNumber: result.serialNumber ?? null,
          routerOsVersion: result.routerOsVersion ?? null,
          architecture: result.architecture ?? null,
          cpu: result.cpu ?? null,
          cpuCount: result.cpuCount ?? null,
          cpuFrequency: result.cpuFrequency ?? null,
          totalMemory: result.totalMemory ?? null,
          totalStorage: result.totalStorage ?? null,
          license: result.license ?? null,
          timezone: result.timezone ?? null,
          ...(recordMetrics
            ? {
                routerOsUpdatePending: result.routerOsUpdatePending ?? false,
                routerboardUpdatePending:
                  result.routerboardUpdatePending ?? false,
                updateCheckedAt: now,
              }
            : {}),
          updatedAt: now,
        },
      });

    await tx
      .insert(mikrotikStatusTable)
      .values({
        deviceId,
        cpuUsage: result.cpuUsage ?? null,
        memoryUsage: result.memoryUsage ?? null,
        freeMemory: result.freeMemory ?? null,
        diskUsage: result.diskUsage ?? null,
        freeDisk: result.freeDisk ?? null,
        uptime: result.uptime ?? null,
        temperature: result.temperature ?? null,
        voltage: result.voltage != null ? String(result.voltage) : null,
        ping: result.latencyMs,
        online: true,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: mikrotikStatusTable.deviceId,
        set: {
          cpuUsage: result.cpuUsage ?? null,
          memoryUsage: result.memoryUsage ?? null,
          freeMemory: result.freeMemory ?? null,
          diskUsage: result.diskUsage ?? null,
          freeDisk: result.freeDisk ?? null,
          uptime: result.uptime ?? null,
          temperature: result.temperature ?? null,
          voltage: result.voltage != null ? String(result.voltage) : null,
          ping: result.latencyMs,
          online: true,
          updatedAt: now,
        },
      });

    if (recordMetrics) {
      await tx.insert(mikrotikMetricsTable).values({
        deviceId,
        cpuUsage: result.cpuUsage ?? null,
        memoryUsage: result.memoryUsage ?? null,
        upload: result.upload ?? null,
        download: result.download ?? null,
        activeUsers: result.activeUsers ?? null,
        createdAt: now,
      });
    }

    if (result.interfaces?.length) {
      await persistDeviceInterfaces(tx, deviceId, result.interfaces, now);
    }

    if (result.services?.length) {
      await persistDeviceServices(tx, deviceId, result.services, now);
    }

    if (result.wans?.length) {
      await persistDeviceWans(tx, deviceId, result.wans, now);
    }
  });
}

export async function persistOfflineDeviceData(
  deviceId: string,
  result: MikrotikPollResult,
): Promise<void> {
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(mikrotikDevicesTable)
      .set({
        online: false,
        updatedAt: now,
      })
      .where(eq(mikrotikDevicesTable.id, deviceId));

    await tx
      .insert(mikrotikStatusTable)
      .values({
        deviceId,
        online: false,
        ping: result.latencyMs,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: mikrotikStatusTable.deviceId,
        set: {
          online: false,
          ping: result.latencyMs,
          updatedAt: now,
        },
      });

    await markDeviceWansOffline(tx, deviceId, now);
  });
}
