"use client";

import { Volume2, VolumeX } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type SoundAlertToggleProps = {
  soundActive: boolean;
  audioReady: boolean;
  onToggle: () => void;
  compact?: boolean;
};

export function SoundAlertToggle({
  soundActive,
  audioReady,
  onToggle,
  compact,
}: SoundAlertToggleProps) {
  const needsUnlock = !audioReady;

  return (
    <Button
      size="sm"
      variant="outline"
      className={cn(
        "border-slate-700 bg-slate-900/70 text-slate-200 hover:bg-slate-800",
        compact && "h-7 px-2 text-xs",
        needsUnlock && "border-amber-500/50 text-amber-200",
        soundActive && "border-emerald-500/40 text-emerald-200",
      )}
      onClick={onToggle}
      title={
        needsUnlock
          ? "Clique para permitir alertas sonoros no navegador"
          : soundActive
            ? "Desativar alertas sonoros"
            : "Ativar alertas sonoros"
      }
    >
      {soundActive ? (
        <Volume2 className={cn("h-4 w-4", !compact && "mr-1.5")} />
      ) : (
        <VolumeX className={cn("h-4 w-4", !compact && "mr-1.5")} />
      )}
      {!compact &&
        (needsUnlock
          ? "Ativar som"
          : soundActive
            ? "Som ativo"
            : "Som desativado")}
    </Button>
  );
}
