import type { MikrotikSession } from "../types";
import {
  updateNtpClientSettings,
  type UpdateNtpInput,
} from "../ntp";

export type { UpdateNtpInput };

export async function updateDeviceNtp(
  session: MikrotikSession,
  input: UpdateNtpInput,
): Promise<void> {
  await updateNtpClientSettings(session, input);
}
