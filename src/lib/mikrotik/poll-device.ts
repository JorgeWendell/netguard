import { updateMikrotikDevice } from "@/services/mikrotik/update-device";

export async function pollAndPersistDevice(deviceId: string) {
  return updateMikrotikDevice(deviceId, { recordMetrics: true });
}

export { runMikrotikWorkerTick as pollEligibleDevices } from "./worker-tick";
