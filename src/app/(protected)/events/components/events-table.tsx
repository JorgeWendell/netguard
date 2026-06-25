"use client";

import { useCallback, useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { useAction } from "next-safe-action/hooks";

import { getAvailabilityEventsAction } from "@/actions/get-availability-events";
import type { AvailabilityEventRow } from "@/lib/events/get-availability-events";
import { AVAILABILITY_EVENTS_PAGE_SIZE } from "@/lib/events/constants";
import { formatDateTime } from "@/lib/monitoring/format";
import { DASHBOARD_REFRESH_INTERVAL_MS } from "@/lib/mikrotik/constants";
import { cn } from "@/lib/utils";
import {
  EventsFilters,
  emptyEventsFilters,
  type EventsFiltersState,
} from "./events-filters";
import { ServicesTable } from "./services-table";
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
} from "@/components/ui/table-pagination";

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

export function EventsTable() {
  const [events, setEvents] = useState<AvailabilityEventRow[]>([]);
  const [filters, setFilters] = useState<EventsFiltersState>(emptyEventsFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const paginated = events.slice(
    (currentPage - 1) * AVAILABILITY_EVENTS_PAGE_SIZE,
    currentPage * AVAILABILITY_EVENTS_PAGE_SIZE,
  );

  const { execute: fetchEvents } = useAction(getAvailabilityEventsAction, {
    onSuccess: ({ data }) => {
      if (data?.success && data.data) {
        setEvents(data.data);
        setUpdatedAt(data.updatedAt);
      }
      setIsLoading(false);
    },
    onError: () => {
      setIsLoading(false);
    },
  });

  const refresh = useCallback(() => {
    setIsLoading(true);
    fetchEvents({
      ...(filters.companyId ? { companyId: filters.companyId } : {}),
      ...(filters.deviceId ? { deviceId: filters.deviceId } : {}),
      ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
      ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
    });
  }, [fetchEvents, filters]);

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
  }, [events.length, filters]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Eventos
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Histórico de online/offline e status dos serviços — atualização a
            cada 30s
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
          <ScrollText className="h-4 w-4 text-violet-500" />
          <span className="text-slate-500 dark:text-slate-400">
            {updatedAt
              ? `Atualizado ${formatDateTime(updatedAt)}`
              : "Carregando..."}
          </span>
        </div>
      </div>

      <EventsFilters filters={filters} onChange={setFilters} />

      <div className="mb-2">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
          Disponibilidade
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Mudanças de online/offline dos equipamentos — eventos mantidos por 7
          dias
        </p>
      </div>

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
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground py-10 text-center"
                >
                  Carregando eventos...
                </TableCell>
              </TableRow>
            ) : events.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-muted-foreground py-10 text-center"
                >
                  {filters.companyId ||
                  filters.deviceId ||
                  filters.dateFrom ||
                  filters.dateTo
                    ? "Nenhum evento encontrado com os filtros selecionados."
                    : "Nenhum evento registrado ainda. Os logs aparecem quando um equipamento muda de online para offline ou vice-versa."}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="whitespace-nowrap font-medium tabular-nums">
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
                  <TableCell className="max-w-[320px] text-sm text-slate-600 dark:text-slate-400">
                    {event.message ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <TablePagination
          totalItems={events.length}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          pageSize={AVAILABILITY_EVENTS_PAGE_SIZE}
        />
      </div>

      <ServicesTable filters={filters} />
    </div>
  );
}
