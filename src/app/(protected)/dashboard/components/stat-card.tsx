import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type StatCardProps = {
  title: string;
  value: number;
  icon: LucideIcon;
  description?: string;
  accent: "emerald" | "rose" | "amber" | "blue" | "violet" | "cyan";
};

const accentStyles = {
  emerald: {
    card: "from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/20",
    icon: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    glow: "shadow-emerald-500/10",
  },
  rose: {
    card: "from-rose-500/10 via-rose-500/5 to-transparent border-rose-500/20",
    icon: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    glow: "shadow-rose-500/10",
  },
  amber: {
    card: "from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/20",
    icon: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    glow: "shadow-amber-500/10",
  },
  blue: {
    card: "from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20",
    icon: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    glow: "shadow-blue-500/10",
  },
  violet: {
    card: "from-violet-500/10 via-violet-500/5 to-transparent border-violet-500/20",
    icon: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    glow: "shadow-violet-500/10",
  },
  cyan: {
    card: "from-cyan-500/10 via-cyan-500/5 to-transparent border-cyan-500/20",
    icon: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
    glow: "shadow-cyan-500/10",
  },
};

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  accent,
}: StatCardProps) {
  const styles = accentStyles[accent];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-gradient-to-br p-5 shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl",
        styles.card,
        styles.glow,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {title}
          </p>
          <p className="text-4xl font-bold tracking-tight text-slate-900 tabular-nums dark:text-white">
            {value.toLocaleString("pt-BR")}
          </p>
          {description ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {description}
            </p>
          ) : null}
        </div>
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
            styles.icon,
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
