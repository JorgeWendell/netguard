import { updateMikrotikDevice } from "@/services/mikrotik/update-device";

import { emitDashboardUpdate } from "@/lib/events/pg-notify";
import { pruneOldAvailabilityEvents } from "@/lib/events/prune-old-availability-events";
import { MIKROTIK_WORKER_CONCURRENCY } from "./constants";
import { getDevicesDueForPoll } from "./get-devices-due";
import { runWithConcurrency } from "./pool";

export async function runMikrotikWorkerTick() {
  const prunedEvents = await pruneOldAvailabilityEvents();

  const dueDevices = await getDevicesDueForPoll();

  if (dueDevices.length === 0) {
    return {
      processed: 0,
      statusUpdates: 0,
      metricsUpdates: 0,
      online: 0,
      offline: 0,
      failed: 0,
      prunedEvents,
    };
  }

  const tasks = dueDevices.map((device) => async () => {
    const result = await updateMikrotikDevice(device.id, {
      recordMetrics: device.dueMetrics,
    });

    return {
      deviceId: device.id,
      dueMetrics: device.dueMetrics,
      dueStatus: device.dueStatus,
      ...result,
    };
  });

  const results = await runWithConcurrency(tasks, MIKROTIK_WORKER_CONCURRENCY);

  let online = 0;
  let offline = 0;
  let failed = 0;
  let statusUpdates = 0;
  let metricsUpdates = 0;

  for (let i = 0; i < results.length; i++) {
    const settled = results[i];
    const device = dueDevices[i];

    if (settled.status === "rejected") {
      failed++;
      continue;
    }

    if (device.dueStatus) statusUpdates++;
    if (device.dueMetrics) metricsUpdates++;

    if (settled.value.online) {
      online++;
    } else {
      offline++;
    }
  }

  const summary = {
    processed: dueDevices.length,
    statusUpdates,
    metricsUpdates,
    online,
    offline,
    failed,
    prunedEvents,
  };

  if (summary.processed > 0) {
    await emitDashboardUpdate({
      type: "stats_updated",
      source: "worker",
      ...summary,
    });
  }

  return summary;
}
