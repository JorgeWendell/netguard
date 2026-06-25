import type { MikrotikRecord, MikrotikSession, MikrotikSystemData } from "./types";
import {
  getFirstRecord,
  parseFloatSafe,
  parseIntSafe,
  usagePercent,
} from "./utils";

async function print(
  session: MikrotikSession,
  path: string,
): Promise<MikrotikRecord[]> {
  return session.write(path).catch(() => [] as MikrotikRecord[]);
}

export async function fetchSystemData(
  session: MikrotikSession,
): Promise<MikrotikSystemData> {
  const [identityData, resourceData, routerboardData, healthData] =
    await Promise.all([
      print(session, "/system/identity/print"),
      print(session, "/system/resource/print"),
      print(session, "/system/routerboard/print"),
      print(session, "/system/health/print"),
    ]);

  const identity = getFirstRecord(identityData);
  const resource = getFirstRecord(resourceData);
  const routerboard = getFirstRecord(routerboardData);
  const health = getFirstRecord(healthData);

  const totalMemory = parseIntSafe(resource?.["total-memory"]);
  const freeMemory = parseIntSafe(resource?.["free-memory"]);
  const totalStorage = parseIntSafe(resource?.["total-hdd-space"]);
  const freeDisk = parseIntSafe(resource?.["free-hdd-space"]);

  return {
    identity: identity?.name,
    boardName: resource?.["board-name"],
    model: routerboard?.model,
    serialNumber: routerboard?.["serial-number"],
    routerOsVersion: resource?.version,
    architecture: resource?.["architecture-name"],
    cpu: resource?.cpu,
    cpuCount: parseIntSafe(resource?.["cpu-count"]) ?? undefined,
    cpuFrequency: parseIntSafe(resource?.["cpu-frequency"]) ?? undefined,
    totalMemory: totalMemory ?? undefined,
    totalStorage: totalStorage ?? undefined,
    license: resource?.["factory-software-id"] ?? resource?.["software-id"],
    timezone: resource?.["time-zone-name"],
    cpuUsage: parseIntSafe(resource?.["cpu-load"]) ?? undefined,
    memoryUsage: usagePercent(totalMemory, freeMemory) ?? undefined,
    freeMemory: freeMemory ?? undefined,
    diskUsage: usagePercent(totalStorage, freeDisk) ?? undefined,
    freeDisk: freeDisk ?? undefined,
    uptime: resource?.uptime,
    temperature: parseIntSafe(health?.temperature) ?? undefined,
    voltage: parseFloatSafe(health?.voltage) ?? undefined,
  };
}
