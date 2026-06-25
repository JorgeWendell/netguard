import type { MikrotikSession } from "../types";
import {
  updateDnsSettings,
  type UpdateDnsInput,
} from "../dns";

export type { UpdateDnsInput };

export async function updateDeviceDns(
  session: MikrotikSession,
  input: UpdateDnsInput,
): Promise<void> {
  await updateDnsSettings(session, input);
}
