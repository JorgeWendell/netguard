import type { MikrotikRecord } from "./types";

export function parseBool(value?: string, defaultValue = false): boolean {
  if (value === undefined) return defaultValue;
  return value === "true" || value === "yes";
}

export function parseIntSafe(value?: string): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export function parseFloatSafe(value?: string): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function getFirstRecord(
  data: MikrotikRecord[],
): MikrotikRecord | undefined {
  return data[0];
}

export function buildServiceKey(
  prefix: string,
  record: MikrotikRecord,
  options?: { fallbackId?: string },
): string | null {
  const id = record[".id"];
  const name = record.name;

  if (id) {
    return `${prefix}:${name ?? id}`;
  }

  if (options?.fallbackId) {
    return `${prefix}:${options.fallbackId}`;
  }

  return null;
}

export function usagePercent(
  total?: number | null,
  free?: number | null,
): number | null {
  if (!total || total <= 0 || free === null || free === undefined) return null;
  return Math.round(((total - free) / total) * 100);
}

export function isUnknownParameterError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes("unknown parameter");
}

export function recordHasField(
  record: MikrotikRecord | undefined,
  field: string,
): boolean {
  return record ? Object.prototype.hasOwnProperty.call(record, field) : false;
}

export async function mikrotikSetWithFallback(
  session: { write: (path: string, params: string[]) => Promise<unknown> },
  setPath: string,
  paramVariants: string[][],
): Promise<void> {
  let lastError: unknown;

  for (const params of paramVariants) {
    if (params.length === 0) continue;

    try {
      await session.write(setPath, params);
      return;
    } catch (error) {
      lastError = error;
      if (!isUnknownParameterError(error)) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Parâmetros inválidos para o equipamento");
}
