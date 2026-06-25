"use client";

import { useCallback, useEffect, useState } from "react";
import { Server } from "lucide-react";
import { useAction } from "next-safe-action/hooks";

import { getDeviceServicesAction } from "@/actions/get-device-services";
import type { DeviceServiceRow } from "@/lib/services/get-device-services";
import { formatServiceLabel } from "@/lib/services/format-service-label";
import { formatDateTime } from "@/lib/monitoring/format";
import { DASHBOARD_REFRESH_INTERVAL_MS } from "@/lib/mikrotik/constants";
import { cn } from "@/lib/utils";
import type { EventsFiltersState } from "./events-filters";
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

function RunningBadge({ running, enabled }: { running: boolean; enabled: boolean }) {
  if (!enabled) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
        <span className="h-2 w-2 rounded-full bg-slate-400" />
        Desabilitado
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-xs font-medium",
        running
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          running ? "bg-emerald-500" : "bg-red-500",
        )}
      />
      {running ? "Running" : "Parado"}
    </span>
  );
}

function formatStatus(status: string | null): string {
  if (!status) return "—";
  const labels: Record<string, string> = {
    configured: "Configurado",
    "not-configured": "Não configurado",
    "resolver-only": "Somente resolver",
    connected: "Conectado",
    disconnected: "Desconectado",
    disabled: "Desabilitado",
    active: "Ativo",
    invalid: "Inválido",
    dynamic: "Dinâmico",
    syncing: "Sincronizando",
    "enabled-no-servers": "Sem servidores",
  };
  return labels[status] ?? status;
}

type ServicesTableProps = {
  filters: EventsFiltersState;
};

export function ServicesTable({ filters }: ServicesTableProps) {
  const [services, setServices] = useState<DeviceServiceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const paginated = services.slice(
    (currentPage - 1) * TABLE_PAGE_SIZE,
    currentPage * TABLE_PAGE_SIZE,
  );

  const { execute: fetchServices } = useAction(getDeviceServicesAction, {
    onSuccess: ({ data }) => {
      if (data?.success && data.data) {
        setServices(data.data);
      }
      setIsLoading(false);
    },
    onError: () => {
      setIsLoading(false);
    },
  });

  const refresh = useCallback(() => {
    setIsLoading(true);
    fetchServices({
      ...(filters.companyId ? { companyId: filters.companyId } : {}),
      ...(filters.deviceId ? { deviceId: filters.deviceId } : {}),
      ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
      ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
    });
  }, [fetchServices, filters]);

  useEffect(() => {
    refresh();

    const interval = setInterval(refresh, DASHBOARD_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    const eventSource = new EventSource("/api/dashboard/events");

    eventSource.onmessage = () => {
      refresh();
    };

    return () => {
      eventSource.close();
    };
  }, [refresh]);

  useEffect(() => {
    setCurrentPage(1);
  }, [services.length, filters]);

  return (
    <div className="mt-10">
      <div className="mb-4 flex items-center gap-2">
        <Server className="h-5 w-5 text-violet-500" />
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          Serviços
        </h2>
      </div>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        Status atual dos serviços coletados nos equipamentos (DHCP, PPPoE, DNS,
        OpenVPN, etc.)
      </p>

      <div className="rounded-md border border-slate-200 dark:border-slate-700">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Serviço</TableHead>
              <TableHead>Running</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Equipamento</TableHead>
              <TableHead>Empresa / Local</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Última verificação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground py-10 text-center"
                >
                  Carregando serviços...
                </TableCell>
              </TableRow>
            ) : services.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-muted-foreground py-10 text-center"
                >
                  {filters.companyId ||
                  filters.deviceId ||
                  filters.dateFrom ||
                  filters.dateTo
                    ? "Nenhum serviço encontrado com os filtros selecionados."
                    : "Nenhum serviço coletado ainda. Os dados aparecem após o worker ou o botão Conectar sincronizar o equipamento."}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {formatServiceLabel(row.service)}
                  </TableCell>
                  <TableCell>
                    <RunningBadge running={row.running} enabled={row.enabled} />
                  </TableCell>
                  <TableCell>{formatStatus(row.status)}</TableCell>
                  <TableCell>{row.deviceName}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{row.companyName}</span>
                      <span className="text-muted-foreground text-xs">
                        {row.locationName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[280px] text-sm text-slate-600 dark:text-slate-400">
                    {row.description ?? "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {row.lastCheck ? formatDateTime(row.lastCheck) : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <TablePagination
          totalItems={services.length}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          pageSize={TABLE_PAGE_SIZE}
        />
      </div>
    </div>
  );
}
