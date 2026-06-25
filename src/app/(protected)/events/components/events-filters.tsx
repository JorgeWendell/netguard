"use client";

import { useEffect } from "react";
import { FilterX } from "lucide-react";
import { useAction } from "next-safe-action/hooks";

import { getCompaniesAction } from "@/actions/get-companies";
import { getMikrotikDevicesAction } from "@/actions/get-mikrotik-devices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type EventsFiltersState = {
  companyId: string;
  deviceId: string;
  dateFrom: string;
  dateTo: string;
};

export const emptyEventsFilters: EventsFiltersState = {
  companyId: "",
  deviceId: "",
  dateFrom: "",
  dateTo: "",
};

const selectClassName = cn(
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30",
);

type EventsFiltersProps = {
  filters: EventsFiltersState;
  onChange: (filters: EventsFiltersState) => void;
};

export function EventsFilters({ filters, onChange }: EventsFiltersProps) {
  const { execute: fetchCompanies, result: companiesResult } =
    useAction(getCompaniesAction);
  const { execute: fetchDevices, result: devicesResult } =
    useAction(getMikrotikDevicesAction);

  useEffect(() => {
    fetchCompanies({});
    fetchDevices({});
  }, [fetchCompanies, fetchDevices]);

  const companies = companiesResult.data?.data ?? [];
  const devices = devicesResult.data?.data ?? [];

  const deviceOptions = filters.companyId
    ? devices.filter((device) => device.companyId === filters.companyId)
    : devices;

  const hasActiveFilters =
    filters.companyId !== "" ||
    filters.deviceId !== "" ||
    filters.dateFrom !== "" ||
    filters.dateTo !== "";

  function update(partial: Partial<EventsFiltersState>) {
    onChange({ ...filters, ...partial });
  }

  function handleCompanyChange(companyId: string) {
    const next: EventsFiltersState = { ...filters, companyId };

    if (companyId && filters.deviceId) {
      const deviceStillValid = devices.some(
        (d) => d.id === filters.deviceId && d.companyId === companyId,
      );
      if (!deviceStillValid) {
        next.deviceId = "";
      }
    }

    onChange(next);
  }

  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Filtros
        </p>
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(emptyEventsFilters)}
          >
            <FilterX className="h-4 w-4" />
            Limpar
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="events-filter-company">Empresa</Label>
          <select
            id="events-filter-company"
            className={selectClassName}
            value={filters.companyId}
            onChange={(e) => handleCompanyChange(e.target.value)}
          >
            <option value="">Todas as empresas</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="events-filter-device">Equipamento</Label>
          <select
            id="events-filter-device"
            className={selectClassName}
            value={filters.deviceId}
            onChange={(e) => update({ deviceId: e.target.value })}
          >
            <option value="">Todos os equipamentos</option>
            {deviceOptions.map((device) => (
              <option key={device.id} value={device.id}>
                {filters.companyId
                  ? device.name
                  : `${device.companyName} — ${device.name}`}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="events-filter-from">De</Label>
          <Input
            id="events-filter-from"
            type="date"
            value={filters.dateFrom}
            max={filters.dateTo || undefined}
            onChange={(e) => update({ dateFrom: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="events-filter-to">Até</Label>
          <Input
            id="events-filter-to"
            type="date"
            value={filters.dateTo}
            min={filters.dateFrom || undefined}
            onChange={(e) => update({ dateTo: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}