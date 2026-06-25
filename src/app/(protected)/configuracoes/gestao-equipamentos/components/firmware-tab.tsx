"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, RefreshCw, RotateCcw, Upload } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

import { checkDeviceUpdateAction } from "@/actions/check-device-update";
import { downloadDeviceUpdateAction } from "@/actions/download-device-update";
import { getDeviceUpdateInfoAction } from "@/actions/get-device-update-info";
import { installDeviceUpdateAction } from "@/actions/install-device-update";
import { rebootDeviceAction } from "@/actions/reboot-device";
import { runDeviceUpdateAction } from "@/actions/run-device-update";
import { setDeviceUpdateChannelAction } from "@/actions/set-device-update-channel";
import { upgradeDeviceRouterboardAction } from "@/actions/upgrade-device-routerboard";
import type {
  PackageUpdateInfo,
  RouterboardInfo,
} from "@/services/mikrotik/system-update";
import {
  hasRouterOsUpdateAvailable,
  hasRouterboardUpgradeAvailable,
} from "@/services/mikrotik/system-update";
import type { MikrotikSystemData } from "@/services/mikrotik/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const selectClassName = cn(
  "border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
);

type UpdateChannel = "stable" | "long-term" | "testing";

type FirmwareTabProps = {
  deviceId: string;
};

function isDownloadReady(status?: string): boolean {
  if (!status) return false;
  const normalized = status.toLowerCase();
  return (
    normalized.includes("downloaded") ||
    normalized.includes("ready to install") ||
    normalized.includes("please reboot")
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-mono text-sm">{value?.trim() || "—"}</span>
    </div>
  );
}

export function FirmwareTab({ deviceId }: FirmwareTabProps) {
  const [update, setUpdate] = useState<PackageUpdateInfo | null>(null);
  const [routerboard, setRouterboard] = useState<RouterboardInfo | null>(null);
  const [system, setSystem] = useState<MikrotikSystemData | null>(null);
  const [channel, setChannel] = useState<UpdateChannel>("stable");
  const [isLoading, setIsLoading] = useState(true);

  const applyInfo = useCallback(
    (payload: {
      update: PackageUpdateInfo;
      routerboard: RouterboardInfo;
      system: MikrotikSystemData;
    }) => {
      setUpdate(payload.update);
      setRouterboard(payload.routerboard);
      setSystem(payload.system);

      const currentChannel = payload.update.channel;
      if (
        currentChannel === "stable" ||
        currentChannel === "long-term" ||
        currentChannel === "testing"
      ) {
        setChannel(currentChannel);
      }
    },
    [],
  );

  const { execute: loadInfo } = useAction(getDeviceUpdateInfoAction, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        applyInfo({
          update: data.update,
          routerboard: data.routerboard,
          system: data.system,
        });
      }
      setIsLoading(false);
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Falha ao carregar informações");
      setIsLoading(false);
    },
  });

  const refresh = useCallback(() => {
    setIsLoading(true);
    loadInfo({ deviceId });
  }, [deviceId, loadInfo]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const { execute: checkUpdate, isExecuting: checking } = useAction(
    checkDeviceUpdateAction,
    {
      onSuccess: ({ data }) => {
        if (data?.update) {
          setUpdate(data.update);
          toast.success("Verificação concluída");
        }
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? "Falha ao verificar atualização");
      },
    },
  );

  const { execute: downloadUpdate, isExecuting: downloading } = useAction(
    downloadDeviceUpdateAction,
    {
      onSuccess: ({ data }) => {
        if (data?.update) {
          setUpdate(data.update);
          toast.success("Download concluído no MikroTik");
        }
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? "Falha ao baixar atualização");
      },
    },
  );

  const { execute: installUpdate, isExecuting: installing } = useAction(
    installDeviceUpdateAction,
    {
      onSuccess: ({ data }) => {
        if (data?.update) {
          setUpdate(data.update);
          toast.success("Atualização instalada — reinicie o equipamento");
        }
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? "Falha ao instalar atualização");
      },
    },
  );

  const { execute: runFullUpdate, isExecuting: runningFull } = useAction(
    runDeviceUpdateAction,
    {
      onSuccess: ({ data }) => {
        if (data?.update) {
          setUpdate(data.update);
          toast.success(
            "RouterOS atualizado. Reinicie o equipamento para concluir.",
          );
        }
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? "Falha ao atualizar RouterOS");
      },
    },
  );

  const { execute: reboot, isExecuting: rebooting } = useAction(
    rebootDeviceAction,
    {
      onSuccess: () => {
        toast.success("Reinício solicitado. O equipamento ficará offline por alguns minutos.");
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? "Falha ao reiniciar equipamento");
      },
    },
  );

  const { execute: saveChannel, isExecuting: savingChannel } = useAction(
    setDeviceUpdateChannelAction,
    {
      onSuccess: ({ data }) => {
        if (data?.update) {
          setUpdate(data.update);
          toast.success("Canal de atualização alterado");
        }
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? "Falha ao alterar canal");
      },
    },
  );

  const { execute: upgradeBoard, isExecuting: upgradingBoard } = useAction(
    upgradeDeviceRouterboardAction,
    {
      onSuccess: () => {
        toast.success(
          "Firmware da placa solicitado. Reinicie o equipamento para aplicar.",
        );
        refresh();
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? "Falha ao atualizar firmware da placa");
      },
    },
  );

  const updateAvailable = update ? hasRouterOsUpdateAvailable(update) : false;
  const downloadReady = isDownloadReady(update?.status);
  const boardUpgradeAvailable = routerboard
    ? hasRouterboardUpgradeAvailable(routerboard)
    : false;

  const busy =
    checking ||
    downloading ||
    installing ||
    runningFull ||
    rebooting ||
    savingChannel ||
    upgradingBoard;

  const handleFullUpdate = () => {
    if (
      !confirm(
        "Isso vai verificar, baixar e instalar a atualização do RouterOS no MikroTik. Depois será necessário reiniciar. Continuar?",
      )
    ) {
      return;
    }

    runFullUpdate({ deviceId });
  };

  const handleReboot = () => {
    if (
      !confirm(
        "O equipamento será reiniciado e ficará offline temporariamente. Continuar?",
      )
    ) {
      return;
    }

    reboot({ deviceId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
        Carregando informações de firmware...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">RouterOS / Firmware</h3>
          <p className="text-muted-foreground text-xs">
            O download é feito pelo próprio MikroTik nos servidores oficiais.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={busy}>
          <RefreshCw className="h-4 w-4" />
          Atualizar status
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <h4 className="text-sm font-medium">RouterOS</h4>
          <div className="space-y-2">
            <InfoRow label="Equipamento" value={system?.identity} />
            <InfoRow label="Modelo" value={system?.model ?? system?.boardName} />
            <InfoRow label="Arquitetura" value={system?.architecture} />
            <InfoRow
              label="Versão instalada"
              value={update?.installedVersion ?? system?.routerOsVersion}
            />
            <InfoRow label="Última disponível" value={update?.latestVersion} />
            <InfoRow label="Status" value={update?.status} />
          </div>

          <div className="space-y-1.5">
            <Label>Canal de atualização</Label>
            <div className="flex gap-2">
              <select
                className={selectClassName}
                value={channel}
                onChange={(e) => setChannel(e.target.value as UpdateChannel)}
                disabled={busy}
              >
                <option value="stable">stable</option>
                <option value="long-term">long-term</option>
                <option value="testing">testing</option>
              </select>
              <Button
                variant="outline"
                disabled={busy || savingChannel}
                onClick={() => saveChannel({ deviceId, channel })}
              >
                Salvar
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => checkUpdate({ deviceId })}
            >
              {checking ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Verificar
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy || !updateAvailable}
              onClick={() => downloadUpdate({ deviceId })}
            >
              {downloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Baixar
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy || !downloadReady}
              onClick={() => installUpdate({ deviceId })}
            >
              {installing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Instalar
            </Button>
          </div>

          <Button
            className="w-full"
            disabled={busy || !updateAvailable}
            onClick={handleFullUpdate}
          >
            {runningFull ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Atualizar RouterOS (automático)
          </Button>

          {updateAvailable ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Há uma versão mais nova disponível para este canal.
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">
              Nenhuma atualização pendente detectada para o canal atual.
            </p>
          )}
        </div>

        <div className="space-y-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <h4 className="text-sm font-medium">RouterBOARD</h4>
          <div className="space-y-2">
            <InfoRow label="Modelo" value={routerboard?.model} />
            <InfoRow
              label="Firmware atual"
              value={routerboard?.currentFirmware}
            />
            <InfoRow
              label="Firmware disponível"
              value={routerboard?.upgradeFirmware}
            />
          </div>

          <Button
            variant="outline"
            className="w-full"
            disabled={busy || !boardUpgradeAvailable}
            onClick={() => {
              if (
                !confirm(
                  "Atualizar o firmware da placa RouterBOARD? Será necessário reiniciar depois.",
                )
              ) {
                return;
              }
              upgradeBoard({ deviceId });
            }}
          >
            {upgradingBoard ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Atualizar firmware da placa
          </Button>

          <div className="border-t border-slate-200 pt-4 dark:border-slate-700">
            <h4 className="mb-2 text-sm font-medium">Reinício</h4>
            <p className="text-muted-foreground mb-3 text-xs">
              Após instalar RouterOS ou firmware da placa, reinicie o equipamento
              para aplicar as mudanças.
            </p>
            <Button
              variant="destructive"
              className="w-full"
              disabled={busy}
              onClick={handleReboot}
            >
              {rebooting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 h-4 w-4" />
              )}
              Reiniciar equipamento
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
