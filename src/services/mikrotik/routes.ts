import type { MikrotikRecord, MikrotikSession } from "./types";
import { parseBool, parseIntSafe } from "./utils";

export type RouteInput = {
  dstAddress: string;
  gateway?: string;
  interface?: string;
  distance?: number;
  routingTable?: string;
  checkGateway?: "" | "ping" | "arp" | "none";
  prefSrc?: string;
  comment?: string;
  disabled?: boolean;
};

export type CreateRouteInput = RouteInput;

export type UpdateRouteInput = RouteInput & {
  routeId: string;
};

export type RouteData = {
  id: string;
  dstAddress?: string;
  gateway?: string;
  interface?: string;
  distance?: number;
  routingTable?: string;
  checkGateway?: string;
  prefSrc?: string;
  comment?: string;
  disabled: boolean;
  active: boolean;
  inactive: boolean;
  gatewayStatus?: string;
};

type ParamOptions = { clearIfEmpty?: boolean };

function appendRouteParam(
  params: string[],
  key: string,
  value?: string | number | boolean,
  options?: ParamOptions,
): void {
  if (value === undefined) return;

  if (typeof value === "boolean") {
    params.push(`=${key}=${value ? "yes" : "no"}`);
    return;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) return;
    params.push(`=${key}=${value}`);
    return;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    if (options?.clearIfEmpty) {
      params.push(`=!${key}`);
    }
    return;
  }

  params.push(`=${key}=${trimmed}`);
}

function resolveRouteInterface(route: MikrotikRecord): string | undefined {
  if (route.interface) {
    return route.interface;
  }

  if (route["vrf-interface"]) {
    return route["vrf-interface"];
  }

  const gatewayStatus = route["gateway-status"];
  const viaMatch = gatewayStatus?.match(/via\s+(\S+)/i);
  if (viaMatch?.[1]) {
    return viaMatch[1];
  }

  const immediateGw = route["immediate-gw"];
  if (immediateGw?.includes("%")) {
    return immediateGw.split("%")[0]?.trim() || undefined;
  }

  return undefined;
}

function resolveGateway(route: MikrotikRecord): string | undefined {
  if (route.gateway) {
    return route.gateway;
  }

  const immediateGw = route["immediate-gw"];
  if (immediateGw?.includes("%")) {
    return immediateGw.split("%")[1]?.trim() || undefined;
  }

  return undefined;
}

function buildRouteParams(
  input: RouteInput,
  options?: ParamOptions,
): string[] {
  const params: string[] = [];

  appendRouteParam(params, "dst-address", input.dstAddress, options);
  appendRouteParam(params, "gateway", input.gateway, options);
  appendRouteParam(params, "interface", input.interface, options);
  appendRouteParam(params, "distance", input.distance, options);
  appendRouteParam(params, "routing-table", input.routingTable, options);
  appendRouteParam(params, "check-gateway", input.checkGateway, options);
  appendRouteParam(params, "pref-src", input.prefSrc, options);
  appendRouteParam(params, "comment", input.comment, options);

  if (input.disabled !== undefined) {
    appendRouteParam(params, "disabled", input.disabled, options);
  }

  return params;
}

export function mapRouteRecord(record: MikrotikRecord): RouteData | null {
  const id = record[".id"];
  if (!id) return null;

  return {
    id,
    dstAddress: record["dst-address"],
    gateway: resolveGateway(record),
    interface: resolveRouteInterface(record),
    distance: parseIntSafe(record.distance) ?? undefined,
    routingTable: record["routing-table"]?.trim() || undefined,
    checkGateway: record["check-gateway"]?.trim() || undefined,
    prefSrc: record["pref-src"]?.trim() || undefined,
    comment: record.comment,
    disabled: parseBool(record.disabled),
    active: parseBool(record.active),
    inactive: parseBool(record.inactive),
    gatewayStatus: record["gateway-status"],
  };
}

export async function fetchRoutes(
  session: MikrotikSession,
): Promise<MikrotikRecord[]> {
  return session.write("/ip/route/print").catch(() => [] as MikrotikRecord[]);
}

export async function fetchRouteList(
  session: MikrotikSession,
): Promise<RouteData[]> {
  const records = await fetchRoutes(session);
  return records
    .map(mapRouteRecord)
    .filter((row): row is RouteData => row !== null);
}

export async function createRoute(
  session: MikrotikSession,
  input: CreateRouteInput,
): Promise<void> {
  if (!input.dstAddress?.trim()) {
    throw new Error("Informe o destino (dst-address)");
  }

  if (!input.gateway?.trim() && !input.interface?.trim()) {
    throw new Error("Informe gateway ou interface");
  }

  const params = buildRouteParams(input);

  await session.write("/ip/route/add", params);
}

export async function updateRoute(
  session: MikrotikSession,
  input: UpdateRouteInput,
): Promise<void> {
  const params = buildRouteParams(input, { clearIfEmpty: true });

  if (params.length === 0) {
    throw new Error("Nenhum campo para atualizar");
  }

  await session.write("/ip/route/set", [`=.id=${input.routeId}`, ...params]);
}

export async function removeRoute(
  session: MikrotikSession,
  routeId: string,
): Promise<void> {
  await session.write("/ip/route/remove", [`=.id=${routeId}`]);
}

export async function setRouteDisabled(
  session: MikrotikSession,
  routeId: string,
  disabled: boolean,
): Promise<void> {
  await session.write("/ip/route/set", [
    `=.id=${routeId}`,
    `=disabled=${disabled ? "yes" : "no"}`,
  ]);
}
