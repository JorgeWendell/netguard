"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Settings, HelpCircle, Activity, ScrollText, Map, FileBarChart } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

type NavItem = {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const navigationItems: NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Monitoramento",
    href: "/monitoring",
    icon: Activity,
  },
  {
    name: "Mapa NOC",
    href: "/map",
    icon: Map,
  },
  {
    name: "Eventos",
    href: "/events",
    icon: ScrollText,
  },
  {
    name: "Relatórios",
    href: "/reports",
    icon: FileBarChart,
  },
];

const utilityItems: NavItem[] = [
  {
    name: "Configurações",
    href: "/configuracoes",
    icon: Settings,
  },
  {
    name: "Suporte",
    href: "/suporte",
    icon: HelpCircle,
  },
];

export function Sidebar({ companyName }: { companyName?: string }) {
  const pathname = usePathname();
  const { theme, mounted } = useTheme();
  const logoSrc = !mounted || theme === "dark" ? "/logo.png" : "/logo2.png";

  return (
    <div className="flex h-screen w-64 flex-col border-r border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col items-center gap-2 px-6 pt-6 pb-4">
        <Image
          src={logoSrc}
          suppressHydrationWarning
          alt="ERP Industrial Logo"
          width={150}
          height={150}
          priority
          unoptimized
          className="mx-auto items-center justify-center"
        />
        {companyName && (
          <p className="text-center text-sm font-medium text-gray-700 dark:text-gray-300">
            {companyName}
          </p>
        )}
      </div>

      <nav className="flex flex-1 flex-col px-4 py-6">
        <div className="space-y-1">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 hover:bg-slate-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-slate-800 dark:hover:text-white",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="flex-1">{item.name}</span>
              </Link>
            );
          })}
        </div>

        <div className="mt-auto space-y-1 border-t border-slate-200 pt-6 dark:border-slate-800">
          {utilityItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 hover:bg-slate-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-slate-800 dark:hover:text-white",
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
