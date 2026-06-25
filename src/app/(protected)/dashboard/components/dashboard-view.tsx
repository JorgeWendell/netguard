"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  Bell,
  Building2,
  MapPin,
  PackageOpen,
  Router,
  Shield,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useAction } from "next-safe-action/hooks";

import { getDashboardStatsAction } from "@/actions/get-dashboard-stats";
import type { DashboardStats } from "@/lib/dashboard/get-stats";
import { cn } from "@/lib/utils";

import { StatCard } from "./stat-card";

const REFRESH_INTERVAL_MS = 30_000;

const emptyStats: DashboardStats = {
  online: 0,
  offline: 0,
  alerts: 0,
  vpnActive: 0,
  pendingUpdates: 0,
  companies: 0,
  locations: 0,
  mikrotiks: 0,
  updatedAt: new Date().toISOString(),
};

function formatUpdatedAt(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(iso));
}

export function DashboardView() {
  const [stats, setStats] = useState<DashboardStats>(emptyStats);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  const { execute: fetchStats } = useAction(getDashboardStatsAction, {
    onSuccess: ({ data }) => {
      if (data?.success && data.data) {
        setStats(data.data);
      }
      setIsLoading(false);
    },
    onError: () => {
      setIsLoading(false);
    },
  });

  const refreshStats = useCallback(() => {
    fetchStats({});
  }, [fetchStats]);

  useEffect(() => {
    refreshStats();

    const interval = setInterval(refreshStats, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refreshStats]);

  useEffect(() => {
    const eventSource = new EventSource("/api/dashboard/events");

    eventSource.onopen = () => {
      setIsLive(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as DashboardStats;
        setStats(payload);
        setIsLoading(false);
      } catch {
        // ignore malformed payloads
      }
    };

    eventSource.onerror = () => {
      setIsLive(false);
    };

    return () => {
      eventSource.close();
      setIsLive(false);
    };
  }, []);

  return (
    <div className="p-6">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Visão geral da infraestrutura — atualização automática a cada 30s
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
          <span
            className={cn(
              "relative flex h-2.5 w-2.5 rounded-full",
              isLive ? "bg-emerald-500" : "bg-amber-500",
            )}
          >
            {isLive ? (
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
            ) : null}
          </span>
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {isLive ? "Ao vivo" : "Polling 30s"}
          </span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-500 dark:text-slate-400">
            Atualizado {formatUpdatedAt(stats.updatedAt)}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800/50"
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Online"
            value={stats.online}
            icon={Wifi}
            description="MikroTiks ativos e respondendo"
            accent="emerald"
          />
          <StatCard
            title="Offline"
            value={stats.offline}
            icon={WifiOff}
            description="Equipamentos sem resposta"
            accent="rose"
          />
          <StatCard
            title="VPNs ativas"
            value={stats.vpnActive}
            icon={Shield}
            description="Equipamentos com OpenVPN conectada"
            accent="violet"
          />
          <StatCard
            title="Atualizações pendentes"
            value={stats.pendingUpdates}
            icon={PackageOpen}
            description="RouterOS ou firmware da placa disponível"
            accent="cyan"
          />
          <StatCard
            title="Alertas"
            value={stats.alerts}
            icon={Bell}
            description="Offline ou uso crítico de recursos"
            accent="amber"
          />
          <StatCard
            title="Empresas"
            value={stats.companies}
            icon={Building2}
            description="Empresas ativas no sistema"
            accent="blue"
          />
          <StatCard
            title="Locais"
            value={stats.locations}
            icon={MapPin}
            description="Unidades cadastradas"
            accent="violet"
          />
          <StatCard
            title="MikroTiks"
            value={stats.mikrotiks}
            icon={Router}
            description="Total de equipamentos ativos"
            accent="cyan"
          />
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 dark:text-white">
              Monitoramento automático
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              O worker verifica os equipamentos a cada 30s. O dashboard busca
              os dados do banco a cada 30s e também recebe eventos em tempo
              real quando houver mudanças.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
