"use client";

import { useEffect } from "react";
import { FilterX } from "lucide-react";
import { useAction } from "next-safe-action/hooks";

import { getCompaniesAction } from "@/actions/get-companies";
import { getLocationsAction } from "@/actions/get-locations";
import { getMikrotikDevicesAction } from "@/actions/get-mikrotik-devices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export type ReportsFiltersState = {
  companyId: string;
  locationId: string;
  deviceId: string;
  dateFrom: string;
  dateTo: string;
};

function formatInputDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function defaultDateRange() {
  const today = new Date();
  const from = new Date();
  from.setDate(today.getDate() - 7);
  return {
    dateFrom: formatInputDate(from),
    dateTo: formatInputDate(today),
  };
}

export const emptyReportsFilters: ReportsFiltersState = {
  companyId: "",
  locationId: "",
  deviceId: "",
  ...defaultDateRange(),
};

const selectClassName = cn(
  "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30",
);

type ReportsFiltersProps = {
  filters: ReportsFiltersState;
  onChange: (filters: ReportsFiltersState) => void;
};

export function ReportsFilters({ filters, onChange }: ReportsFiltersProps) {
  const { execute: fetchCompanies, result: companiesResult } =
    useAction(getCompaniesAction);
  const { execute: fetchLocations, result: locationsResult } =
    useAction(getLocationsAction);
  const { execute: fetchDevices, result: devicesResult } =
    useAction(getMikrotikDevicesAction);

  useEffect(() => {
    fetchCompanies({});
    fetchDevices({});
  }, [fetchCompanies, fetchDevices]);

  useEffect(() => {
    fetchLocations({
      ...(filters.companyId ? { companyId: filters.companyId } : {}),
    });
  }, [fetchLocations, filters.companyId]);

  const companies = companiesResult.data?.data ?? [];
  const locations = locationsResult.data?.data ?? [];
  const devices = devicesResult.data?.data ?? [];

  const locationOptions = filters.companyId
    ? locations.filter((location) => location.companyId === filters.companyId)
    : locations;

  const deviceOptions = devices.filter((device) => {
    if (filters.companyId && device.companyId !== filters.companyId) {
      return false;
    }
    if (filters.locationId && device.locationId !== filters.locationId) {
      return false;
    }
    return true;
  });

  const hasActiveFilters =
    filters.companyId !== "" ||
    filters.locationId !== "" ||
    filters.deviceId !== "";

  function update(partial: Partial<ReportsFiltersState>) {
    onChange({ ...filters, ...partial });
  }

  function handleCompanyChange(companyId: string) {
    const next: ReportsFiltersState = {
      ...filters,
      companyId,
      locationId: "",
      deviceId: "",
    };
    onChange(next);
  }

  function handleLocationChange(locationId: string) {
    const next: ReportsFiltersState = { ...filters, locationId, deviceId: "" };

    if (locationId && filters.deviceId) {
      const valid = devices.some(
        (device) =>
          device.id === filters.deviceId && device.locationId === locationId,
      );
      if (!valid) next.deviceId = "";
    }

    onChange(next);
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Filtros do relatório
        </p>
        {hasActiveFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({
                ...emptyReportsFilters,
                dateFrom: filters.dateFrom,
                dateTo: filters.dateTo,
              })
            }
          >
            <FilterX className="h-4 w-4" />
            Limpar escopo
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <div className="space-y-1.5">
          <Label htmlFor="reports-filter-company">Empresa</Label>
          <select
            id="reports-filter-company"
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
          <Label htmlFor="reports-filter-location">Local</Label>
          <select
            id="reports-filter-location"
            className={selectClassName}
            value={filters.locationId}
            onChange={(e) => handleLocationChange(e.target.value)}
          >
            <option value="">Todos os locais</option>
            {locationOptions.map((location) => (
              <option key={location.id} value={location.id}>
                {filters.companyId
                  ? location.name
                  : `${location.companyName} — ${location.name}`}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reports-filter-device">Equipamento</Label>
          <select
            id="reports-filter-device"
            className={selectClassName}
            value={filters.deviceId}
            onChange={(e) => update({ deviceId: e.target.value })}
          >
            <option value="">Todos os equipamentos</option>
            {deviceOptions.map((device) => (
              <option key={device.id} value={device.id}>
                {device.companyName} — {device.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reports-filter-from">De</Label>
          <Input
            id="reports-filter-from"
            type="date"
            required
            value={filters.dateFrom}
            max={filters.dateTo || undefined}
            onChange={(e) => update({ dateFrom: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reports-filter-to">Até</Label>
          <Input
            id="reports-filter-to"
            type="date"
            required
            value={filters.dateTo}
            min={filters.dateFrom || undefined}
            onChange={(e) => update({ dateTo: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

export function getReportsFilterLabels(
  filters: ReportsFiltersState,
  companies: { id: string; name: string }[],
  locations: { id: string; name: string; companyName?: string }[],
  devices: { id: string; name: string }[],
) {
  return {
    companyLabel: filters.companyId
      ? (companies.find((c) => c.id === filters.companyId)?.name ??
        "Selecionada")
      : "Todas",
    locationLabel: filters.locationId
      ? (locations.find((l) => l.id === filters.locationId)?.name ??
        "Selecionado")
      : "Todos",
    deviceLabel: filters.deviceId
      ? (devices.find((d) => d.id === filters.deviceId)?.name ?? "Selecionado")
      : "Todos",
  };
}
