"use client";

import { useCallback, useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { useAction } from "next-safe-action/hooks";

import { getMonitoringDataAction } from "@/actions/get-monitoring-data";
import type { MonitoringRow } from "@/lib/monitoring/get-monitoring-data";
import {
  formatBytes,
  formatDateTime,
  formatPercent,
} from "@/lib/monitoring/format";
import { DASHBOARD_REFRESH_INTERVAL_MS } from "@/lib/mikrotik/constants";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TablePagination,
  TABLE_PAGE_SIZE,
} from "@/components/ui/table-pagination";

function StatusDot({
  active,
  activeLabel,
  inactiveLabel,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return (
    <span className="flex justify-center">
      <span
        className={cn(
          "h-3 w-3 rounded-full",
          active
            ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
            : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]",
        )}
        title={active ? activeLabel : inactiveLabel}
      />
    </span>
  );
}

function WanLinksCell({
  wans,
}: {
  wans: MonitoringRow["wans"];
}) {
  if (wans.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <div className="flex min-w-[180px] flex-col gap-1.5">
      {wans.map((wan) => (
        <div
          key={wan.interface}
          className="flex items-center gap-2 text-xs"
          title={
            wan.online
              ? `${wan.interface} online`
              : `${wan.interface} offline`
          }
        >
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              wan.online ? "bg-emerald-500" : "bg-red-500",
            )}
          />
          <span className="font-medium text-slate-700 dark:text-slate-200">
            {wan.interface}
          </span>
          {wan.latencyMs != null ? (
            <span className="text-muted-foreground tabular-nums">
              {wan.latencyMs} ms
            </span>
          ) : !wan.online ? (
            <span className="text-muted-foreground">offline</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function UsageCell({ value }: { value: number | null }) {
  if (value == null) {
    return <span className="text-muted-foreground">—</span>;
  }

  const color =
    value >= 85
      ? "text-red-600 dark:text-red-400"
      : value >= 70
        ? "text-amber-600 dark:text-amber-400"
        : "text-slate-700 dark:text-slate-300";

  return <span className={cn("font-medium tabular-nums", color)}>{value}%</span>;
}

export function MonitoringTable() {
  const [rows, setRows] = useState<MonitoringRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const paginated = rows.slice(
    (currentPage - 1) * TABLE_PAGE_SIZE,
    currentPage * TABLE_PAGE_SIZE,
  );

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
    setCurrentPage(1);
  }, [rows.length]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Monitoramento
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Status e métricas dos equipamentos MikroTik — atualização a cada
            30s
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
          <Activity className="h-4 w-4 text-blue-500" />
          <span className="text-slate-500 dark:text-slate-400">
            {updatedAt
              ? `Atualizado ${formatDateTime(updatedAt)}`
              : "Carregando..."}
          </span>
        </div>
      </div>

      <div className="rounded-md border border-slate-200 dark:border-slate-700">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px] text-center">Online</TableHead>
              <TableHead>Equipamento</TableHead>
              <TableHead>Empresa / Local</TableHead>
              <TableHead>Host</TableHead>
              <TableHead>CPU</TableHead>
              <TableHead>Memória</TableHead>
              <TableHead>Disco</TableHead>
              <TableHead>Uptime</TableHead>
              <TableHead>Upload</TableHead>
              <TableHead>Download</TableHead>
              <TableHead>Links WAN</TableHead>
              <TableHead>IP Público</TableHead>
              <TableHead className="w-[60px] text-center">VPN</TableHead>
              <TableHead>Atualizado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={14}
                  className="text-muted-foreground py-10 text-center"
                >
                  Carregando monitoramento...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={14}
                  className="text-muted-foreground py-10 text-center"
                >
                  Nenhum equipamento ativo para monitorar
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((row) => (
                <TableRow key={row.deviceId}>
                  <TableCell>
                    <StatusDot
                      active={row.online}
                      activeLabel="Online"
                      inactiveLabel="Offline"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{row.deviceName}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{row.companyName}</span>
                      <span className="text-muted-foreground text-xs">
                        {row.locationName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{row.host}</TableCell>
                  <TableCell>
                    <UsageCell value={row.cpuUsage} />
                  </TableCell>
                  <TableCell>
                    <UsageCell value={row.memoryUsage} />
                  </TableCell>
                  <TableCell>
                    <UsageCell value={row.diskUsage} />
                  </TableCell>
                  <TableCell className="max-w-[120px] truncate">
                    {row.uptime ?? "—"}
                  </TableCell>
                  <TableCell>{formatBytes(row.upload)}</TableCell>
                  <TableCell>{formatBytes(row.download)}</TableCell>
                  <TableCell>
                    <WanLinksCell wans={row.wans} />
                  </TableCell>
                  <TableCell className="font-mono text-sm tabular-nums">
                    {row.publicIp ?? "—"}
                  </TableCell>
                  <TableCell>
                    <StatusDot
                      active={row.vpnConnected}
                      activeLabel="VPN conectada"
                      inactiveLabel="VPN desconectada"
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {formatDateTime(row.statusUpdatedAt ?? row.metricsUpdatedAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <TablePagination
          totalItems={rows.length}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          pageSize={TABLE_PAGE_SIZE}
        />
      </div>
    </div>
  );
}
