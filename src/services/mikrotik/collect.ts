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

/**
 * Pipeline por equipamento (uma sessão):
 * connect → system → interfaces → services → wans → pppoe → queues → disconnect
 */
export async function collectDeviceData(
  credentials: MikrotikDeviceCredentials,
  options: CollectDeviceDataOptions = {},
): Promise<MikrotikPollResult> {
  const startedAt = Date.now();
  let session: MikrotikSession | undefined;

  try {
    session = await connect(credentials);

    const system = await fetchSystemData(session);
    const interfaces = await fetchInterfaceList(session);
    const traffic = trafficFromInterfaces(interfaces);
    const services = await fetchServiceList(session);
    const wans = await fetchWanList(session);
    const activeUsers = await fetchActiveSessionCount(session);
    const queueCount = await fetchQueueCount(session);

    let routerOsUpdatePending = false;
    let routerboardUpdatePending = false;

    if (options.checkUpdates) {
      const [packageUpdate, routerboard] = await Promise.all([
        fetchPackageUpdateInfo(session),
        fetchRouterboardInfo(session),
      ]);
      routerOsUpdatePending = hasRouterOsUpdateAvailable(packageUpdate);
      routerboardUpdatePending = hasRouterboardUpgradeAvailable(routerboard);
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
      error instanceof Error ? error.message : "Falha ao conectar no equipamento";

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
