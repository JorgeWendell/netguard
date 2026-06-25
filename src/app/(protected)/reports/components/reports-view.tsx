"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileDown, FileText, Loader2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

import { getCompaniesAction } from "@/actions/get-companies";
import { getLocationsAction } from "@/actions/get-locations";
import { getMikrotikDevicesAction } from "@/actions/get-mikrotik-devices";
import { getReportDataAction } from "@/actions/get-report-data";
import type { ReportData } from "@/lib/reports/get-report-data";
import { exportReportPdf } from "@/lib/reports/export-report-pdf";
import { formatDateTime } from "@/lib/monitoring/format";
import { formatServiceLabel } from "@/lib/services/format-service-label";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  ReportsFilters,
  emptyReportsFilters,
  getReportsFilterLabels,
  type ReportsFiltersState,
} from "./reports-filters";

function EventBadge({ eventType }: { eventType: "online" | "offline" }) {
  const isOnline = eventType === "online";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-2.5 py-0.5 text-xs font-medium",
        isOnline
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          isOnline ? "bg-emerald-500" : "bg-red-500",
        )}
      />
      {isOnline ? "Online" : "Offline"}
    </span>
  );
}

function RunningBadge({
  running,
  enabled,
}: {
  running: boolean;
  enabled: boolean;
}) {
  if (!enabled) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
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
      {running ? "Em execução" : "Parado"}
    </span>
  );
}

export function ReportsView() {
  const [filters, setFilters] =
    useState<ReportsFiltersState>(emptyReportsFilters);
  const [report, setReport] = useState<ReportData | null>(null);

  const { execute: fetchCompanies, result: companiesResult } =
    useAction(getCompaniesAction);
  const { execute: fetchLocations, result: locationsResult } =
    useAction(getLocationsAction);
  const { execute: fetchDevices, result: devicesResult } =
    useAction(getMikrotikDevicesAction);

  const { execute: fetchReport, isExecuting } = useAction(getReportDataAction, {
    onSuccess: ({ data }) => {
      if (data?.success && data.data) {
        setReport(data.data);
        toast.success("Relatório gerado com sucesso");
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Falha ao gerar relatório");
    },
  });

  useEffect(() => {
    fetchCompanies({});
    fetchLocations({});
    fetchDevices({});
  }, [fetchCompanies, fetchDevices, fetchLocations]);

  const companies = companiesResult.data?.data ?? [];
  const locations = locationsResult.data?.data ?? [];
  const devices = devicesResult.data?.data ?? [];

  const filterLabels = useMemo(
    () => getReportsFilterLabels(filters, companies, locations, devices),
    [companies, devices, filters, locations],
  );

  const generateReport = useCallback(() => {
    if (!filters.dateFrom || !filters.dateTo) {
      toast.error("Informe o período do relatório");
      return;
    }

    fetchReport({
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
      ...(filters.companyId ? { companyId: filters.companyId } : {}),
      ...(filters.locationId ? { locationId: filters.locationId } : {}),
      ...(filters.deviceId ? { deviceId: filters.deviceId } : {}),
    });
  }, [fetchReport, filters]);

  const handleExportPdf = useCallback(() => {
    if (!report) {
      toast.error("Gere o relatório antes de exportar");
      return;
    }

    exportReportPdf(report, {
      companyLabel: filterLabels.companyLabel,
      locationLabel: filterLabels.locationLabel,
      deviceLabel: filterLabels.deviceLabel,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    });
    toast.success("PDF exportado");
  }, [filterLabels, filters.dateFrom, filters.dateTo, report]);

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Relatórios
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Extraia logs de disponibilidade e status de serviços por empresa,
            local ou equipamento — exporte em PDF
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={generateReport} disabled={isExecuting}>
            {isExecuting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            Gerar relatório
          </Button>
          <Button
            variant="outline"
            onClick={handleExportPdf}
            disabled={!report || isExecuting}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <ReportsFilters filters={filters} onChange={setFilters} />
      </div>

      {report && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50/80 px-4 py-3 text-sm text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-100">
          <p>
            <span className="font-medium">{report.availability.length}</span>{" "}
            eventos de disponibilidade e{" "}
            <span className="font-medium">{report.services.length}</span>{" "}
            registros de serviços no período.
          </p>
          {(report.availabilityTruncated || report.servicesTruncated) && (
            <p className="mt-1 text-amber-700 dark:text-amber-300">
              Parte dos dados foi omitida por exceder o limite do relatório.
            </p>
          )}
        </div>
      )}

      <div className="space-y-8">
        <section>
          <h2 className="mb-2 text-xl font-semibold text-slate-900 dark:text-white">
            Disponibilidade
          </h2>
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
            Mudanças de online/offline dos equipamentos no período selecionado
          </p>

          <div className="rounded-md border border-slate-200 dark:border-slate-700">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data / Hora</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Empresa / Local</TableHead>
                  <TableHead>Host</TableHead>
                  <TableHead>Descrição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!report ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-muted-foreground py-10 text-center"
                    >
                      Selecione os filtros e clique em Gerar relatório
                    </TableCell>
                  </TableRow>
                ) : report.availability.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-muted-foreground py-10 text-center"
                    >
                      Nenhum evento de disponibilidade no período
                    </TableCell>
                  </TableRow>
                ) : (
                  report.availability.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {formatDateTime(event.createdAt)}
                      </TableCell>
                      <TableCell>
                        <EventBadge eventType={event.eventType} />
                      </TableCell>
                      <TableCell>{event.deviceName}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{event.companyName}</span>
                          <span className="text-muted-foreground text-xs">
                            {event.locationName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{event.host}</TableCell>
                      <TableCell className="max-w-[280px] text-sm">
                        {event.message ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-xl font-semibold text-slate-900 dark:text-white">
            Serviços
          </h2>
          <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">
            Serviços cuja última verificação está dentro do período selecionado
          </p>

          <div className="rounded-md border border-slate-200 dark:border-slate-700">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Última verificação</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Equipamento</TableHead>
                  <TableHead>Empresa / Local</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Execução</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!report ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-muted-foreground py-10 text-center"
                    >
                      Selecione os filtros e clique em Gerar relatório
                    </TableCell>
                  </TableRow>
                ) : report.services.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-muted-foreground py-10 text-center"
                    >
                      Nenhum serviço verificado no período
                    </TableCell>
                  </TableRow>
                ) : (
                  report.services.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {service.lastCheck
                          ? formatDateTime(service.lastCheck)
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {formatServiceLabel(service.service)}
                      </TableCell>
                      <TableCell>{service.deviceName}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{service.companyName}</span>
                          <span className="text-muted-foreground text-xs">
                            {service.locationName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{service.status ?? "—"}</TableCell>
                      <TableCell>
                        <RunningBadge
                          running={service.running}
                          enabled={service.enabled}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </section>
      </div>
    </div>
  );
}
