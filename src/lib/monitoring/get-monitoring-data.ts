import { asc, desc, eq, like } from "drizzle-orm";

import { db } from "@/db/index";
import { isVpnOrTunnelInterface } from "@/lib/mikrotik/is-vpn-interface";
import {
  companiesTable,
  locationsTable,
  mikrotikDevicesTable,
  mikrotikMetricsTable,
  mikrotikServicesTable,
  mikrotikStatusTable,
  mikrotikWanTable,
} from "@/db/schema";

export type MonitoringWanLink = {
  interface: string;
  online: boolean;
  latencyMs: number | null;
  publicIp: string | null;
};

export type MonitoringRow = {
  deviceId: string;
  deviceName: string;
  host: string;
  companyName: string;
  locationName: string;
  online: boolean;
  cpuUsage: number | null;
  memoryUsage: number | null;
  diskUsage: number | null;
  uptime: string | null;
  vpnConnected: boolean;
  upload: number | null;
  download: number | null;
  publicIp: string | null;
  wans: MonitoringWanLink[];
  statusUpdatedAt: Date | null;
  metricsUpdatedAt: Date | null;
};

export async function getMonitoringData(): Promise<MonitoringRow[]> {
  const devices = await db
    .select({
      deviceId: mikrotikDevicesTable.id,
      deviceName: mikrotikDevicesTable.name,
      host: mikrotikDevicesTable.host,
      companyName: companiesTable.name,
      locationName: locationsTable.name,
      deviceOnline: mikrotikDevicesTable.online,
      cpuUsage: mikrotikStatusTable.cpuUsage,
      memoryUsage: mikrotikStatusTable.memoryUsage,
      diskUsage: mikrotikStatusTable.diskUsage,
      uptime: mikrotikStatusTable.uptime,
      statusOnline: mikrotikStatusTable.online,
      statusUpdatedAt: mikrotikStatusTable.updatedAt,
    })
    .from(mikrotikDevicesTable)
    .innerJoin(
      locationsTable,
      eq(mikrotikDevicesTable.locationId, locationsTable.id),
    )
    .innerJoin(
      companiesTable,
      eq(locationsTable.companyId, companiesTable.id),
    )
    .leftJoin(
      mikrotikStatusTable,
      eq(mikrotikDevicesTable.id, mikrotikStatusTable.deviceId),
    )
    .where(eq(mikrotikDevicesTable.active, true))
    .orderBy(
      asc(companiesTable.name),
      asc(locationsTable.name),
      asc(mikrotikDevicesTable.name),
    );

  const latestMetrics = await db
    .selectDistinctOn([mikrotikMetricsTable.deviceId], {
      deviceId: mikrotikMetricsTable.deviceId,
      upload: mikrotikMetricsTable.upload,
      download: mikrotikMetricsTable.download,
      metricsUpdatedAt: mikrotikMetricsTable.createdAt,
    })
    .from(mikrotikMetricsTable)
    .orderBy(
      mikrotikMetricsTable.deviceId,
      desc(mikrotikMetricsTable.createdAt),
    );

  const wans = await db
    .select({
      deviceId: mikrotikWanTable.deviceId,
      interface: mikrotikWanTable.interface,
      online: mikrotikWanTable.online,
      latencyMs: mikrotikWanTable.latencyMs,
      publicIp: mikrotikWanTable.publicIp,
      priority: mikrotikWanTable.priority,
    })
    .from(mikrotikWanTable)
    .orderBy(asc(mikrotikWanTable.priority), asc(mikrotikWanTable.interface));

  const metricsMap = new Map(
    latestMetrics.map((metric) => [metric.deviceId, metric]),
  );

  const wansByDevice = new Map<string, MonitoringWanLink[]>();
  const publicIpMap = new Map<string, string>();

  for (const wan of wans) {
    if (isVpnOrTunnelInterface(wan.interface)) {
      continue;
    }

    const list = wansByDevice.get(wan.deviceId) ?? [];
    list.push({
      interface: wan.interface,
      online: wan.online ?? false,
      latencyMs: wan.latencyMs,
      publicIp: wan.publicIp,
    });
    wansByDevice.set(wan.deviceId, list);

    if (!publicIpMap.has(wan.deviceId) && wan.publicIp) {
      publicIpMap.set(wan.deviceId, wan.publicIp);
    }
  }

  const openVpnServices = await db
    .select({
      deviceId: mikrotikServicesTable.deviceId,
      running: mikrotikServicesTable.running,
    })
    .from(mikrotikServicesTable)
    .where(like(mikrotikServicesTable.service, "openvpn-client:%"));

  const vpnConnectedMap = new Map<string, boolean>();
  for (const service of openVpnServices) {
    if (service.running) {
      vpnConnectedMap.set(service.deviceId, true);
    } else if (!vpnConnectedMap.has(service.deviceId)) {
      vpnConnectedMap.set(service.deviceId, false);
    }
  }

  return devices.map((device) => {
    const metric = metricsMap.get(device.deviceId);

    return {
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      host: device.host,
      companyName: device.companyName,
      locationName: device.locationName,
      online: device.statusOnline ?? device.deviceOnline,
      cpuUsage: device.cpuUsage,
      memoryUsage: device.memoryUsage,
      diskUsage: device.diskUsage,
      uptime: device.uptime,
      vpnConnected: vpnConnectedMap.get(device.deviceId) ?? false,
      upload: metric?.upload ?? null,
      download: metric?.download ?? null,
      publicIp: publicIpMap.get(device.deviceId) ?? null,
      wans: wansByDevice.get(device.deviceId) ?? [],
      statusUpdatedAt: device.statusUpdatedAt,
      metricsUpdatedAt: metric?.metricsUpdatedAt ?? null,
    };
  });
}
