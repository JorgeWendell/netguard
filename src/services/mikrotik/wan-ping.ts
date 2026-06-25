import type { MikrotikRecord, MikrotikSession } from "./types";

export type WanPingResult = {
  online: boolean;
  latencyMs: number | null;
  packetLoss: number | null;
};

export const WAN_PING_TARGET =
  process.env.WAN_PING_TARGET?.trim() || "1.1.1.1";

export const WAN_PING_COUNT = Number(process.env.WAN_PING_COUNT ?? 3);

function parseRttToMs(value?: string): number | null {
  if (!value || value === "timeout") return null;

  const msMatch = value.match(/(\d+)ms/);
  if (msMatch) {
    const ms = Number(msMatch[1]);
    const usMatch = value.match(/(\d+)us/);
    const extraUs = usMatch ? Number(usMatch[1]) : 0;
    return ms + Math.round(extraUs / 1000);
  }

  const usOnly = value.match(/^(\d+)us$/);
  if (usOnly) {
    return Math.max(1, Math.round(Number(usOnly[1]) / 1000));
  }

  return null;
}

function parsePacketLoss(value?: string): number | null {
  if (!value) return null;
  const parsed = Number(String(value).replace("%", "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

export function parsePingSummary(records: MikrotikRecord[]): WanPingResult {
  let latencyMs: number | null = null;
  let packetLoss: number | null = null;
  let successfulReplies = 0;

  for (const record of records) {
    if (record["avg-rtt"]) {
      latencyMs = parseRttToMs(record["avg-rtt"]);
    } else if (record.time && record.time !== "timeout") {
      latencyMs = parseRttToMs(record.time) ?? latencyMs;
    }

    if (record["packet-loss"] != null) {
      packetLoss = parsePacketLoss(record["packet-loss"]);
    }

    if (record.time && record.time !== "timeout") {
      successfulReplies++;
    }
  }

  const online =
    packetLoss != null ? packetLoss < 100 : successfulReplies > 0;

  return {
    online,
    latencyMs,
    packetLoss,
  };
}

async function runPing(
  session: MikrotikSession,
  params: string[],
): Promise<WanPingResult | null> {
  try {
    const records = (await session.write("/ping", params)) as MikrotikRecord[];
    if (!records?.length) return null;
    return parsePingSummary(records);
  } catch {
    return null;
  }
}

export type WanPingTarget = {
  interface: string;
  gateway?: string;
  localIp?: string;
  routingTable?: string;
};

/** Testa conectividade de cada WAN (routing-table → src-address → interface → gateway). */
export async function pingWanLink(
  session: MikrotikSession,
  wan: WanPingTarget,
): Promise<WanPingResult> {
  const baseParams = [
    `=address=${WAN_PING_TARGET}`,
    `=count=${WAN_PING_COUNT}`,
  ];

  const attempts: string[][] = [];

  if (wan.routingTable) {
    attempts.push([...baseParams, `=routing-table=${wan.routingTable}`]);
  }

  if (wan.localIp) {
    attempts.push([...baseParams, `=src-address=${wan.localIp}`]);
  }

  attempts.push([...baseParams, `=interface=${wan.interface}`]);

  if (wan.gateway) {
    attempts.push([
      `=address=${wan.gateway}`,
      `=count=${WAN_PING_COUNT}`,
      `=interface=${wan.interface}`,
    ]);
  }

  for (const params of attempts) {
    const result = await runPing(session, params);
    if (result?.online) {
      return result;
    }
  }

  const lastAttempt = await runPing(session, attempts[0] ?? baseParams);
  return (
    lastAttempt ?? {
      online: false,
      latencyMs: null,
      packetLoss: 100,
    }
  );
}
