import type { MikrotikRecord, MikrotikSession } from "./types";

export async function fetchActiveSessionCount(
  session: MikrotikSession,
): Promise<number> {
  const [hotspotActive, pppActive] = await Promise.all([
    session
      .write("/ip/hotspot/active/print")
      .catch(() => [] as MikrotikRecord[]),
    session.write("/ppp/active/print").catch(() => [] as MikrotikRecord[]),
  ]);

  return hotspotActive.length + pppActive.length;
}
