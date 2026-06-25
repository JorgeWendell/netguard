"use client";

import { useMemo } from "react";
import { Network } from "lucide-react";

import type { AccessInterfaceRow } from "@/services/mikrotik/access/fetch-access-data";
import {
  flattenInterfaceTree,
  type InterfaceTreeRow,
} from "@/services/mikrotik/access/interface-list";
import { formatBytes } from "@/lib/monitoring/format";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function InterfaceStatusIcon({
  enabled,
  running,
}: {
  enabled: boolean;
  running: boolean;
}) {
  const title = !enabled
    ? "Desabilitada"
    : running
      ? "Rodando"
      : "Parada";

  return (
    <span
      className={cn(
        "inline-block h-3 w-3 rounded-sm",
        !enabled
          ? "bg-slate-400"
          : running
            ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.7)]"
            : "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]",
      )}
      title={title}
    />
  );
}

function formatCount(value: number | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString("pt-BR");
}

function formatMtu(value: number | undefined): string {
  if (value == null) return "—";
  return String(value);
}

type InterfacesTabProps = {
  interfaces: AccessInterfaceRow[];
};

export function InterfacesTab({ interfaces }: InterfacesTabProps) {
  const rows = useMemo(
    () => flattenInterfaceTree(interfaces),
    [interfaces],
  );

  const runningCount = interfaces.filter((iface) => iface.running).length;

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Network className="h-5 w-5 text-sky-500" />
          <div>
            <h3 className="text-sm font-semibold">Interface List</h3>
            <p className="text-muted-foreground text-xs">
              {interfaces.length} interface(s) · {runningCount} rodando
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-emerald-500" />
            Rodando
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-red-500" />
            Parada
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-slate-400" />
            Desabilitada
          </span>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground py-10 text-center text-sm">
          Nenhuma interface encontrada
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[36px]" />
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">RX</TableHead>
                <TableHead className="text-right">TX</TableHead>
                <TableHead className="text-right">RX Packet</TableHead>
                <TableHead className="text-right">TX Packet</TableHead>
                <TableHead className="text-right">MTU</TableHead>
                <TableHead className="text-right">Actual MTU</TableHead>
                <TableHead className="text-right">L2 MTU</TableHead>
                <TableHead>MAC Address</TableHead>
                <TableHead>Comentário</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <InterfaceRow key={row.interfaceId} row={row} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function InterfaceRow({ row }: { row: InterfaceTreeRow }) {
  return (
    <TableRow className={cn(!row.enabled && "opacity-60")}>
      <TableCell>
        <InterfaceStatusIcon enabled={row.enabled} running={row.running} />
      </TableCell>
      <TableCell>
        <span
          className="font-mono text-sm font-medium"
          style={{ paddingLeft: `${row.depth * 18}px` }}
        >
          {row.depth > 0 && (
            <span className="text-muted-foreground mr-1">↳</span>
          )}
          {row.name}
        </span>
      </TableCell>
      <TableCell className="text-sm">{row.type ?? "—"}</TableCell>
      <TableCell className="text-right font-mono text-xs tabular-nums">
        {formatBytes(row.rxBytes)}
      </TableCell>
      <TableCell className="text-right font-mono text-xs tabular-nums">
        {formatBytes(row.txBytes)}
      </TableCell>
      <TableCell className="text-right font-mono text-xs tabular-nums">
        {formatCount(row.rxPackets)}
      </TableCell>
      <TableCell className="text-right font-mono text-xs tabular-nums">
        {formatCount(row.txPackets)}
      </TableCell>
      <TableCell className="text-right font-mono text-xs tabular-nums">
        {formatMtu(row.mtu)}
      </TableCell>
      <TableCell className="text-right font-mono text-xs tabular-nums">
        {formatMtu(row.actualMtu)}
      </TableCell>
      <TableCell className="text-right font-mono text-xs tabular-nums">
        {formatMtu(row.l2Mtu)}
      </TableCell>
      <TableCell className="font-mono text-xs">{row.macAddress ?? "—"}</TableCell>
      <TableCell className="max-w-[200px] truncate text-sm">
        {row.comment ?? "—"}
      </TableCell>
    </TableRow>
  );
}
