"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Search,
  Bell,
  ChevronRight,
  LogOut,
  Moon,
  Sun,
  User,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

interface HeaderProps {
  userName: string;
  userRole?: string;
}

const pageTitleMap: Record<string, string> = {
  "/dashboard": "Visão Geral",
  "/monitoring": "Monitoramento",
  "/map": "Mapa NOC",
  "/events": "Eventos",
  "/financeiro": "Financeiro",
  "/producao": "Produção",
  "/estoque": "Estoque",
  "/vendas": "Vendas",
  "/orcamentos": "Orçamentos",
  "/compras": "Compras",
  "/faturamento": "Faturamento",
  "/engenharia": "Engenharia",
  "/relatorios": "Relatórios",
  "/configuracoes": "Configurações",
  "/configuracoes/gestao-cargos": "Gestão de Cargos",
  "/configuracoes/gestao-empresa": "Gestão da Empresa",
  "/configuracoes/gestao-usuarios": "Gestão de Usuários",
  "/configuracoes/gestao-permissoes": "Gestão de Permissões",
  "/configuracoes/cadastro-clientes": "Cadastro de Clientes",
  "/configuracoes/cadastro-fornecedores": "Cadastro de Fornecedores",
  "/configuracoes/gestao-categorias": "Gestão de Categorias",
  "/configuracoes/cadastro-locais": "Cadastro de Locais",
  "/configuracoes/grupos-subgrupos": "Grupos e Subgrupos",
  "/configuracoes/cadastro-produtos": "Cadastro de Produtos",
  "/suporte": "Suporte",
  "/perfil": "Meu Perfil",
};

const getBreadcrumbs = (
  pathname: string,
): { label: string; path: string }[] => {
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: { label: string; path: string }[] = [
    { label: "Console Principal", path: "/dashboard" },
  ];

  if (segments.length === 0) {
    return breadcrumbs;
  }

  let currentPath = "";
  segments.forEach((segment) => {
    currentPath += `/${segment}`;
    if (breadcrumbs.some((crumb) => crumb.path === currentPath)) {
      return;
    }
    const title =
      pageTitleMap[currentPath] ||
      segment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    breadcrumbs.push({ label: title, path: currentPath });
  });

  return breadcrumbs;
};

export function Header({ userName }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [searchValue, setSearchValue] = useState("");

  const breadcrumbs = getBreadcrumbs(pathname);
  const title =
    pageTitleMap[pathname] ||
    breadcrumbs[breadcrumbs.length - 1]?.label ||
    "Dashboard";

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center gap-2 text-sm">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <div key={`${crumb.path}-${index}`} className="flex items-center gap-2">
                  {isLast ? (
                    <span className="text-blue-500">{crumb.label}</span>
                  ) : (
                    <Link
                      href={crumb.path}
                      className="text-gray-600 transition-colors hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400"
                    >
                      {crumb.label}
                    </Link>
                  )}
                  {!isLast && (
                    <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-8">
          <div className="relative w-full max-w-md">
            <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
            <Input
              type="search"
              placeholder="Buscar pedidos, clientes..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="w-full rounded-lg bg-slate-100 pr-4 pl-10 text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-800 dark:text-white dark:placeholder:text-gray-400"
            />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-end gap-4">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="relative text-blue-600 hover:bg-slate-100 dark:text-blue-400 dark:hover:bg-slate-800"
            >
              <Bell className="h-6 w-6" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col text-right">
              <span className="font-semibold text-gray-900 dark:text-white">
                {userName}
              </span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-auto p-0 hover:bg-transparent dark:hover:bg-transparent"
                >
                  <Avatar className="ring-2 ring-blue-500">
                    <AvatarFallback>{getInitials(userName)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"
              >
                <DropdownMenuItem asChild>
                  <Link
                    href="/perfil"
                    className="flex cursor-pointer items-center text-gray-900 focus:bg-slate-100 focus:text-gray-900 dark:text-white dark:focus:bg-slate-700 dark:focus:text-white"
                  >
                    <User className="mr-2 h-4 w-4" />
                    <span>Meu Perfil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700" />
                <DropdownMenuItem
                  onClick={toggleTheme}
                  className="cursor-pointer text-gray-900 focus:bg-slate-100 focus:text-gray-900 dark:text-white dark:focus:bg-slate-700 dark:focus:text-white"
                >
                  {theme === "dark" ? (
                    <>
                      <Sun className="mr-2 h-4 w-4" />
                      <span>Tema Claro</span>
                    </>
                  ) : (
                    <>
                      <Moon className="mr-2 h-4 w-4" />
                      <span>Tema Escuro</span>
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-200 dark:bg-slate-700" />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-red-600 focus:bg-slate-100 focus:text-red-700 dark:text-red-400 dark:focus:bg-slate-700 dark:focus:text-red-300"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
