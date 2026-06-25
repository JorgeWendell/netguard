"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Map as MapIcon,
  Maximize2,
  Minimize2,
  Search,
} from "lucide-react";
import { useAction } from "next-safe-action/hooks";

import { getMonitoringDataAction } from "@/actions/get-monitoring-data";
import type { MonitoringRow } from "@/lib/monitoring/get-monitoring-data";
import { formatDateTime } from "@/lib/monitoring/format";
import { DASHBOARD_REFRESH_INTERVAL_MS } from "@/lib/mikrotik/constants";
import { useNocSoundAlerts } from "@/hooks/use-noc-sound-alerts";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SoundAlertToggle } from "./sound-alert-toggle";

type FilterMode = "all" | "issues" | "online";
type DeviceHealth = "ok" | "warning" | "critical";
type DeviceVariant = "default" | "compact" | "wall";

const WALL_TARGET_DEVICES = 30;
const WALL_COLS = 6;

function getDeviceHealth(row: MonitoringRow): DeviceHealth {
  if (!row.online) return "critical";
  if (!row.vpnConnected) return "warning";
  return "ok";
}

function healthStyles(health: DeviceHealth) {
  switch (health) {
    case "ok":
      return {
        ring: "ring-emerald-500/40",
        glow: "shadow-[0_0_24px_rgba(16,185,129,0.25)]",
        accent: "from-emerald-500/20 to-emerald-600/5",
        border: "border-emerald-500/30",
      };
    case "warning":
      return {
        ring: "ring-amber-500/40",
        glow: "shadow-[0_0_24px_rgba(245,158,11,0.2)]",
        accent: "from-amber-500/20 to-amber-600/5",
        border: "border-amber-500/30",
      };
    case "critical":
      return {
        ring: "ring-red-500/40",
        glow: "shadow-[0_0_24px_rgba(239,68,68,0.22)]",
        accent: "from-red-500/20 to-red-600/5",
        border: "border-red-500/30",
      };
  }
}

function getWallGrid(count: number) {
  if (count <= 0) return { cols: WALL_COLS, rows: 0 };
  return { cols: WALL_COLS, rows: Math.ceil(count / WALL_COLS) };
}

/** Poucos equipamentos: altura fixa. Muitos: divide a tela sem scroll. */
function getWallRowHeight(rows: number) {
  if (rows <= 0) return "3.5rem";
  if (rows <= 4) {
    return `clamp(3rem, calc((100dvh - 3.5rem) / ${rows}), 5.5rem)`;
  }
  return `calc((100dvh - 3.5rem) / ${rows})`;
}

function getAlertBlinkClass(row: MonitoringRow) {
  if (!row.online) return "animate-noc-blink-offline";
  if (!row.vpnConnected) return "animate-noc-blink-vpn";
  if (row.wans.some((wan) => !wan.online)) return "animate-noc-blink-vpn";
  return "";
}

function resolvePublicIp(row: MonitoringRow) {
  if (row.publicIp) return row.publicIp;
  return row.wans.find((wan) => wan.publicIp)?.publicIp ?? null;
}

function StatusDots({
  row,
  size = "md",
}: {
  row: MonitoringRow;
  size?: "sm" | "md";
}) {
  const dotClass = size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5";

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      <span
        className={cn(
          "inline-flex rounded-full",
          dotClass,
          row.online
            ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]"
            : "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]",
        )}
        title={row.online ? "Equipamento online" : "Equipamento offline"}
      />
      <span
        className={cn(
          "inline-flex rounded-full",
          dotClass,
          row.vpnConnected
            ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]"
            : "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]",
        )}
        title={row.vpnConnected ? "VPN conectada" : "VPN desconectada"}
      />
      {row.wans.map((wan) => (
        <span
          key={wan.interface}
          className={cn(
            "inline-flex rounded-full ring-1 ring-slate-600/80",
            dotClass,
            wan.online
              ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]"
              : "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]",
          )}
          title={`${wan.interface}: ${wan.online ? "online" : "offline"}${
            wan.latencyMs != null ? ` · ${wan.latencyMs} ms` : ""
          }`}
        />
      ))}
    </div>
  );
}

function DeviceInfo({
  row,
  compact,
}: {
  row: MonitoringRow;
  compact?: boolean;
}) {
  const publicIp = resolvePublicIp(row);

  return (
    <div className="min-w-0 space-y-0.5">
      <h3
        className={cn(
          "truncate font-semibold text-white",
          compact ? "text-xs" : "text-sm",
        )}
      >
        {row.deviceName}
      </h3>
      <p
        className={cn(
          "truncate font-mono text-slate-400",
          compact ? "text-[10px]" : "text-xs",
        )}
      >
        {row.host}
      </p>
      <p
        className={cn(
          "truncate font-mono text-sky-400/90",
          compact ? "text-[10px]" : "text-xs",
        )}
      >
        {publicIp ?? "—"}
      </p>
    </div>
  );
}

function SummaryPill({
  label,
  value,
  tone,
  compact,
}: {
  label: string;
  value: number;
  tone: "neutral" | "success" | "danger" | "warning" | "info";
  compact?: boolean;
}) {
  const tones = {
    neutral: "border-slate-700/80 bg-slate-800/60 text-slate-200",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    danger: "border-red-500/30 bg-red-500/10 text-red-300",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    info: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  };

  return (
    <div
      className={cn(
        "rounded-xl border backdrop-blur-sm",
        compact ? "px-3 py-2" : "px-4 py-3",
        tones[tone],
      )}
    >
      <p className="text-[10px] tracking-wide uppercase opacity-80">{label}</p>
      <p
        className={cn(
          "font-bold tabular-nums",
          compact ? "text-lg" : "text-2xl",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function WallStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "success" | "danger" | "warning" | "info";
}) {
  const tones = {
    neutral: "text-slate-300",
    success: "text-emerald-300",
    danger: "text-red-300",
    warning: "text-amber-300",
    info: "text-sky-300",
  };

  return (
    <span className={cn("text-xs tabular-nums", tones[tone])}>
      <span className="text-slate-500">{label}</span>{" "}
      <span className="font-semibold">{value}</span>
    </span>
  );
}

function DeviceNode({
  row,
  variant = "default",
}: {
  row: MonitoringRow;
  variant?: DeviceVariant;
}) {
  const health = getDeviceHealth(row);
  const styles = healthStyles(health);
  const href = `/configuracoes/gestao-equipamentos/${row.deviceId}/acessar`;
  const blinkClass = getAlertBlinkClass(row);

  if (variant === "wall") {
    return (
      <Link
        href={href}
        className={cn(
          "flex h-full min-h-[3rem] flex-col justify-center gap-1 overflow-hidden rounded-md border bg-gradient-to-br px-2 py-1 transition-colors hover:bg-white/5",
          styles.border,
          styles.accent,
          blinkClass,
        )}
      >
        <StatusDots row={row} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-[11px] leading-tight font-semibold text-white">
            {row.deviceName}
          </p>
          <p className="truncate font-mono text-[9px] leading-tight text-slate-400">
            {row.host}
          </p>
          <p className="truncate font-mono text-[9px] leading-tight text-sky-400/90">
            {resolvePublicIp(row) ?? "—"}
          </p>
        </div>
      </Link>
    );
  }

  const compact = variant === "compact";

  const className = cn(
    "group relative overflow-hidden border bg-gradient-to-br transition-all duration-300 hover:-translate-y-0.5",
    compact ? "rounded-lg p-2.5" : "rounded-2xl p-3.5",
    styles.border,
    compact ? "shadow-[0_0_12px_rgba(0,0,0,0.2)]" : styles.glow,
    styles.accent,
    blinkClass,
  );

  return (
    <Link href={href} className={className}>
      <div
        className={cn(
          "absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100",
          "bg-gradient-to-br from-white/5 to-transparent",
        )}
      />

      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <DeviceInfo row={row} compact={compact} />
        </div>
        <StatusDots row={row} size={compact ? "sm" : "md"} />
      </div>
    </Link>
  );
}

export function NocMapView() {
  const [rows, setRows] = useState<MonitoringRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { soundActive, audioReady, enableSound, toggleSound } =
    useNocSoundAlerts(rows, isLoading);

  const enterFullscreen = useCallback(async () => {
    await enableSound();
    setIsFullscreen(true);
  }, [enableSound]);

  const { execute: fetchMonitoring } = useAction(getMonitoringDataAction, {
    onSuccess: ({ data }) => {
      if (data?.success && data.data) {
        setRows(data.data);
        setUpdatedAt(data.updatedAt);
      }
      setIsLoading(false);
    },
    onError: () => {
      setIsLoading(false);
    },
  });

  const refresh = useCallback(() => {
    fetchMonitoring({});
  }, [fetchMonitoring]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, DASHBOARD_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    if (!isFullscreen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFullscreen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  const stats = useMemo(() => {
    const online = rows.filter((row) => row.online).length;
    const vpnOk = rows.filter((row) => row.vpnConnected).length;
    const issues = rows.filter(
      (row) => !row.online || !row.vpnConnected,
    ).length;

    return {
      total: rows.length,
      online,
      offline: rows.length - online,
      vpnOk,
      vpnDown: rows.length - vpnOk,
      issues,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      if (filter === "online" && !row.online) return false;
      if (filter === "issues" && row.online && row.vpnConnected) return false;

      if (!query) return true;

      const haystack = [
        row.deviceName,
        row.companyName,
        row.locationName,
        row.host,
        row.publicIp ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [rows, filter, search]);

  const sortedRows = useMemo(
    () =>
      [...filteredRows].sort((a, b) => {
        const byCompany = a.companyName.localeCompare(b.companyName);
        if (byCompany !== 0) return byCompany;
        const byLocation = a.locationName.localeCompare(b.locationName);
        if (byLocation !== 0) return byLocation;
        return a.deviceName.localeCompare(b.deviceName);
      }),
    [filteredRows],
  );

  const wallGrid = useMemo(
    () => getWallGrid(sortedRows.length),
    [sortedRows.length],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, MonitoringRow[]>>();

    for (const row of filteredRows) {
      if (!map.has(row.companyName)) {
        map.set(row.companyName, new Map());
      }

      const locations = map.get(row.companyName)!;
      if (!locations.has(row.locationName)) {
        locations.set(row.locationName, []);
      }

      locations.get(row.locationName)!.push(row);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([companyName, locations]) => ({
        companyName,
        locations: Array.from(locations.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([locationName, devices]) => ({
            locationName,
            devices: devices.sort((a, b) =>
              a.deviceName.localeCompare(b.deviceName),
            ),
          })),
      }));
  }, [filteredRows]);

  const useCompactCards = rows.length >= 12;

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[200] flex h-screen flex-col overflow-hidden bg-slate-950">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.06),transparent_40%)]" />

        <header className="relative flex shrink-0 items-center justify-between gap-3 border-b border-slate-800/80 px-3 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="shrink-0 text-sm font-bold text-white">Mapa NOC</h1>
            <div className="hidden flex-wrap items-center gap-x-3 gap-y-1 sm:flex">
              <WallStat label="Eq." value={stats.total} tone="neutral" />
              <WallStat label="On" value={stats.online} tone="success" />
              <WallStat label="Off" value={stats.offline} tone="danger" />
              <WallStat label="VPN" value={stats.vpnOk} tone="success" />
              <WallStat label="Alertas" value={stats.issues} tone="info" />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                OK
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                VPN
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                Off
              </span>
            </div>
            <div className="flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-slate-900/70 px-2 py-1 text-[10px] text-slate-400">
              <Activity className="h-3 w-3 text-emerald-400" />
              {updatedAt ? formatDateTime(updatedAt) : "..."}
            </div>
            <SoundAlertToggle
              soundActive={soundActive}
              audioReady={audioReady}
              onToggle={toggleSound}
              compact
            />
            <Button
              size="sm"
              variant="outline"
              className="h-7 border-slate-700 bg-slate-900/70 px-2 text-xs text-slate-200 hover:bg-slate-800"
              onClick={() => setIsFullscreen(false)}
            >
              <Minimize2 className="mr-1 h-3.5 w-3.5" />
              Sair
            </Button>
          </div>
        </header>

        <main className="relative min-h-0 flex-1 p-2">
          {isLoading ? (
            <div className="flex h-full items-center justify-center gap-2 text-slate-400">
              <Activity className="h-5 w-5 animate-pulse" />
              Carregando...
            </div>
          ) : sortedRows.length === 0 ? (
            <div className="flex h-full items-center justify-center text-slate-400">
              Nenhum equipamento encontrado.
            </div>
          ) : (
            <div
              className={cn(
                "grid content-start gap-1.5",
                wallGrid.rows > 4 && "h-full",
              )}
              style={{
                gridTemplateColumns: `repeat(${wallGrid.cols}, minmax(0, 1fr))`,
                gridAutoRows: getWallRowHeight(wallGrid.rows),
              }}
            >
              {sortedRows.map((device) => (
                <DeviceNode
                  key={device.deviceId}
                  row={device}
                  variant="wall"
                />
              ))}
            </div>
          )}
        </main>

        {sortedRows.length > WALL_TARGET_DEVICES && (
          <p className="shrink-0 border-t border-slate-800/80 px-3 py-1 text-center text-[10px] text-amber-400/90">
            Mais de {WALL_TARGET_DEVICES} equipamentos — use filtros ou saia da
            tela cheia para ver todos com conforto.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] p-4 md:p-6">
      <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.08),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.06),transparent_35%)]" />
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative border-b border-slate-800/80 px-5 py-5 md:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-sky-400">
                <MapIcon className="h-5 w-5" />
                <span className="text-xs font-semibold tracking-[0.2em] uppercase">
                  Network Operations Center
                </span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white">
                Mapa NOC
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Visão em tempo real dos equipamentos — online e VPN
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-3 rounded-full border border-slate-700/80 bg-slate-900/70 px-4 py-2 text-sm text-slate-300">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                <Activity className="h-4 w-4 text-emerald-400" />
                {updatedAt
                  ? formatDateTime(updatedAt)
                  : "Sincronizando..."}
              </div>
              <SoundAlertToggle
                soundActive={soundActive}
                audioReady={audioReady}
                onToggle={toggleSound}
              />
              <Button
                size="sm"
                variant="outline"
                className="border-slate-700 bg-slate-900/70 text-slate-200 hover:bg-slate-800"
                onClick={() => void enterFullscreen()}
              >
                <Maximize2 className="mr-1.5 h-4 w-4" />
                Tela cheia
              </Button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <SummaryPill
              label="Equipamentos"
              value={stats.total}
              tone="neutral"
            />
            <SummaryPill label="Online" value={stats.online} tone="success" />
            <SummaryPill label="Offline" value={stats.offline} tone="danger" />
            <SummaryPill label="VPN OK" value={stats.vpnOk} tone="success" />
            <SummaryPill
              label="VPN down"
              value={stats.vpnDown}
              tone="warning"
            />
            <SummaryPill label="Alertas" value={stats.issues} tone="info" />
          </div>

          <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: "all", label: "Todos" },
                  { id: "online", label: "Online" },
                  { id: "issues", label: "Com alerta" },
                ] as const
              ).map((item) => (
                <Button
                  key={item.id}
                  size="sm"
                  variant={filter === item.id ? "default" : "outline"}
                  className={cn(
                    filter !== item.id &&
                      "border-slate-700 bg-slate-900/50 text-slate-300 hover:bg-slate-800",
                  )}
                  onClick={() => setFilter(item.id)}
                >
                  {item.id === "issues" && (
                    <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {item.label}
                </Button>
              ))}
            </div>

            <div className="relative w-full lg:max-w-sm">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar equipamento, empresa, host..."
                className="border-slate-700 bg-slate-900/70 pl-9 text-slate-100 placeholder:text-slate-500"
              />
            </div>
          </div>
        </div>

        <div className="relative px-5 py-6 md:px-8">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-24 text-slate-400">
              <Activity className="h-5 w-5 animate-pulse" />
              Carregando mapa NOC...
            </div>
          ) : grouped.length === 0 ? (
            <div className="py-24 text-center text-slate-400">
              Nenhum equipamento encontrado com os filtros atuais.
            </div>
          ) : (
            <div className="space-y-10">
              {grouped.map((company) => (
                <section key={company.companyName}>
                  <div className="mb-4 flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-white">
                      {company.companyName}
                    </h2>
                    <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-400">
                      {company.locations.reduce(
                        (acc, loc) => acc + loc.devices.length,
                        0,
                      )}{" "}
                      equip.
                    </span>
                  </div>

                  <div className="space-y-6">
                    {company.locations.map((location) => (
                      <div key={location.locationName}>
                        <p className="mb-3 text-xs font-medium tracking-wider text-slate-500 uppercase">
                          {location.locationName}
                        </p>
                        <div
                          className={cn(
                            "grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
                            useCompactCards &&
                              "gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
                          )}
                        >
                          {location.devices.map((device) => (
                            <DeviceNode
                              key={device.deviceId}
                              row={device}
                              variant={useCompactCards ? "compact" : "default"}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <div className="relative border-t border-slate-800/80 px-5 py-3 text-xs text-slate-500 md:px-8">
          <span className="mr-4 inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            1ª bolinha: equipamento
          </span>
          <span className="mr-4 inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            2ª bolinha: VPN
          </span>
          <span className="mr-4 inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-slate-600" />
            Demais: links WAN
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Offline
          </span>
        </div>
      </div>
    </div>
  );
}
