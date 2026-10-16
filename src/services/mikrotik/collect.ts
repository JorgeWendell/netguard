import { connect, disconnect } from "./connect";
import {
  fetchInterfaceList,
  trafficFromInterfaces,
} from "./interfaces";
import { fetchActiveSessionCount } from "./pppoe";
import { fetchQueueCount } from "./queues";
import { fetchServiceList } from "./services";
import {
  fetchPackageUpdateInfo,
  fetchRouterboardInfo,
  hasRouterOsUpdateAvailable,
  hasRouterboardUpgradeAvailable,
} from "./system-update";
import { fetchSystemData } from "./system";
import { fetchWanList } from "./wan";
import type {
  MikrotikDeviceCredentials,
  MikrotikPollResult,
  MikrotikSession,
} from "./types";

export type CollectDeviceDataOptions = {
  checkUpdates?: boolean;
};

async function safeCollect<T>(
  fn: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export async function collectDeviceData(
  credentials: MikrotikDeviceCredentials,
  options: CollectDeviceDataOptions = {},
): Promise<MikrotikPollResult> {
  const startedAt = Date.now();
  let session: MikrotikSession | undefined;

  try {
    session = await connect(credentials);

    const system = await safeCollect(() => fetchSystemData(session!), {});
    const interfaces = await safeCollect(
      () => fetchInterfaceList(session!),
      [],
    );
    const traffic = trafficFromInterfaces(interfaces);
    const services = await safeCollect(() => fetchServiceList(session!), []);
    const wans = await safeCollect(() => fetchWanList(session!), []);
    const activeUsers = await safeCollect(
      () => fetchActiveSessionCount(session!),
      undefined,
    );
    const queueCount = await safeCollect(
      () => fetchQueueCount(session!),
      undefined,
    );

    let routerOsUpdatePending = false;
    let routerboardUpdatePending = false;

    if (options.checkUpdates) {
      const [packageUpdate, routerboard] = await Promise.all([
        safeCollect(() => fetchPackageUpdateInfo(session!), null),
        safeCollect(() => fetchRouterboardInfo(session!), null),
      ]);
      if (packageUpdate) {
        routerOsUpdatePending = hasRouterOsUpdateAvailable(packageUpdate);
      }
      if (routerboard) {
        routerboardUpdatePending =
          hasRouterboardUpgradeAvailable(routerboard);
      }
    }

    return {
      online: true,
      latencyMs: Date.now() - startedAt,
      ...system,
      interfaces,
      services,
      wans,
      upload: traffic.upload,
      download: traffic.download,
      activeUsers,
      queueCount,
      routerOsUpdatePending,
      routerboardUpdatePending,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Falha ao conectar no equipamento";

    return {
      online: false,
      latencyMs: Date.now() - startedAt,
      error: message,
    };
  } finally {
    if (session) {
      disconnect(session);
    }
  }
}
