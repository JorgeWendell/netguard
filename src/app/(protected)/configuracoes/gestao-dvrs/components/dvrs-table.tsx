"use client";

import { useEffect, useState } from "react";
import { MoreHorizontal, Pencil, Plug, RefreshCw, Trash2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  TablePagination,
  TABLE_PAGE_SIZE,
} from "@/components/ui/table-pagination";
import { getDvrsAction } from "@/actions/get-dvrs";
import { deleteDvrAction } from "@/actions/delete-dvr";
import { syncDvrChannelsAction } from "@/actions/sync-dvr-channels";
import { getDvrHost } from "@/lib/dvr/get-dvr-host";
import { DvrForm } from "./dvr-form";

type Dvr = {
  id: string;
  locationId: string;
  locationName: string;
  companyName: string;
  name: string;
  serialNumber: string;
  ddns: string | null;
  ip: string | null;
  httpPort: number;
  rtspPort: number;
  username: string;
  model: string | null;
  channelCount: number;
  online: boolean;
  lastSeen: Date | null;
  lastCheckAt: Date | null;
  lastError: string | null;
  active: boolean;
  notes: string | null;
};

function formatDateTime(date: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date));
}

function matchesSearch(dvr: Dvr, search: string) {
  const term = search.trim().toLowerCase();
  if (!term) return true;

  return [
    dvr.name,
    dvr.serialNumber,
    dvr.ddns,
    dvr.ip,
    dvr.locationName,
    dvr.companyName,
    dvr.model,
  ].some((value) => value?.toLowerCase().includes(term));
}

export function DvrsTable() {
  const [dvrs, setDvrs] = useState<Dvr[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingDvr, setEditingDvr] = useState<Dvr | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dvrToDelete, setDvrToDelete] = useState<string | null>(null);
  const [syncingDvrId, setSyncingDvrId] = useState<string | null>(null);

  const filtered = dvrs.filter((dvr) => matchesSearch(dvr, search));
  const totalPages = Math.max(1, Math.ceil(filtered.length / TABLE_PAGE_SIZE));
  const activePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice(
    (activePage - 1) * TABLE_PAGE_SIZE,
    activePage * TABLE_PAGE_SIZE,
  );

  const { execute: fetchDvrs } = useAction(getDvrsAction, {
    onSuccess: ({ data }) => {
      if (data?.success && data.data) {
        setDvrs(data.data);
      }
      setIsLoading(false);
    },
    onError: () => {
      toast.error("Erro ao carregar DVRs");
      setIsLoading(false);
    },
  });

  const { execute: deleteDvr } = useAction(deleteDvrAction, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success("DVR excluído com sucesso!");
        fetchDvrs({});
        setDeleteDialogOpen(false);
        setDvrToDelete(null);
      }
    },
    onError: () => {
      toast.error("Erro ao excluir DVR");
    },
  });

  const { execute: syncDvr } = useAction(syncDvrChannelsAction, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success(
          `Conectado${data.model ? ` (${data.model})` : ""}: ${data.channelCount} câmeras sincronizadas`,
        );
      } else if (data?.error) {
        toast.error(data.error);
      }
      fetchDvrs({});
    },
    onError: ({ error }) => {
      toast.error(error.serverError || "Erro ao conectar no DVR");
    },
    onSettled: () => {
      setSyncingDvrId(null);
    },
  });

  useEffect(() => {
    fetchDvrs({});
  }, [fetchDvrs]);

  useEffect(() => {
    const handleDvrChanged = () => {
      fetchDvrs({});
    };

    window.addEventListener("dvr-changed", handleDvrChanged);
    return () => {
      window.removeEventListener("dvr-changed", handleDvrChanged);
    };
  }, [fetchDvrs]);

  const handleSync = (dvr: Dvr) => {
    setSyncingDvrId(dvr.id);
    syncDvr({ id: dvr.id });
  };

  const handleEdit = (dvr: Dvr) => {
    setEditingDvr(dvr);
    setEditDialogOpen(true);
  };

  const handleEditDialogClose = (open: boolean) => {
    setEditDialogOpen(open);
    if (!open) {
      setEditingDvr(null);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDvrToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (dvrToDelete) {
      deleteDvr({ id: dvrToDelete });
    }
  };

  if (isLoading) {
    return <div className="py-8 text-center">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Buscar por nome, SN, endereço, empresa ou local"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setCurrentPage(1);
        }}
        className="max-w-md"
      />
      <div className="rounded-md border border-slate-200 dark:border-slate-700">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Empresa / Local</TableHead>
              <TableHead>Endereço</TableHead>
              <TableHead>SN</TableHead>
              <TableHead>Câmeras</TableHead>
              <TableHead>Online</TableHead>
              <TableHead>Última verificação</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-muted-foreground py-8 text-center"
                >
                  Nenhum DVR encontrado
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((dvr) => (
                <TableRow key={dvr.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{dvr.name}</span>
                      {dvr.model && (
                        <span className="text-muted-foreground text-xs">
                          {dvr.model}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{dvr.companyName}</span>
                      <span className="text-muted-foreground text-xs">
                        {dvr.locationName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getDvrHost(dvr)}:{dvr.httpPort}
                  </TableCell>
                  <TableCell>{dvr.serialNumber}</TableCell>
                  <TableCell>{dvr.channelCount}</TableCell>
                  <TableCell>
                    <span
                      title={dvr.lastError ?? undefined}
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        dvr.online
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {dvr.online ? "Online" : "Offline"}
                    </span>
                  </TableCell>
                  <TableCell>{formatDateTime(dvr.lastCheckAt)}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        dvr.active
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      }`}
                    >
                      {dvr.active ? "Ativo" : "Inativo"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleSync(dvr)}
                          disabled={syncingDvrId === dvr.id}
                        >
                          {dvr.channelCount > 0 ? (
                            <RefreshCw className="mr-2 h-4 w-4" />
                          ) : (
                            <Plug className="mr-2 h-4 w-4" />
                          )}
                          {syncingDvrId === dvr.id
                            ? "Conectando..."
                            : "Testar e sincronizar canais"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(dvr)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(dvr.id)}
                          className="text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          totalItems={filtered.length}
          currentPage={activePage}
          onPageChange={setCurrentPage}
          pageSize={TABLE_PAGE_SIZE}
        />

        <DvrForm
          dvr={editingDvr}
          open={editDialogOpen}
          onOpenChange={handleEditDialogClose}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este DVR e todas as suas
                câmeras? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
