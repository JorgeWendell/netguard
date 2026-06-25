import Link from "next/link";
import { Users, ChevronRight, Building2, MapPin, Router } from "lucide-react";

const settingsLinks = [
  {
    href: "/configuracoes/gestao-usuarios",
    icon: Users,
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconColor: "text-blue-600 dark:text-blue-400",
    title: "Gestão de usuários",
    description: "Cadastro de usuários e convites de acesso",
  },
  {
    href: "/configuracoes/gestao-empresas",
    icon: Building2,
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    title: "Gestão de empresas",
    description: "Cadastro de empresas clientes do sistema",
  },
  {
    href: "/configuracoes/locais",
    icon: MapPin,
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconColor: "text-amber-600 dark:text-amber-400",
    title: "Gestão de locais",
    description: "Cadastro de locais vinculados às empresas",
  },
  {
    href: "/configuracoes/gestao-equipamentos",
    icon: Router,
    iconBg: "bg-violet-100 dark:bg-violet-900/30",
    iconColor: "text-violet-600 dark:text-violet-400",
    title: "Gestão de equipamentos",
    description: "Cadastro de roteadores MikroTik por local",
  },
];

export default function Configuracoes() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Configurações
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Gerencie usuários, empresas, locais e equipamentos do sistema
        </p>
      </div>
      <div className="space-y-3">
        {settingsLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg ${item.iconBg}`}
              >
                <Icon className={`h-6 w-6 ${item.iconColor}`} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {item.description}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400 dark:text-gray-500" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
