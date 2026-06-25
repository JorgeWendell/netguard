"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Download, ExternalLink, MoreHorizontal, Pencil, Plug, Trash2 } from "lucide-react";
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
import { getMikrotikDevicesAction } from "@/actions/get-mikrotik-devices";
import { deleteMikrotikDeviceAction } from "@/actions/delete-mikrotik-device";
import { connectMikrotikDeviceAction } from "@/actions/connect-mikrotik-device";
import { exportMikrotikConfigAction } from "@/actions/export-mikrotik-config";
import { DeviceForm } from "./device-form";

type Device = {
  id: string;
  locationId: string;
  locationName: string;
  companyName: string;
  name: string;
  description: string | null;
  host: string;
  apiPort: number;
  apiSsl: boolean;
  username: string;
  monitoringEnabled: boolean;
  alertsEnabled: boolean;
  backupEnabled: boolean;
  pollInterval: number;
  online: boolean;
  lastSeen: Date | null;
  lastBackup: Date | null;
  active: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function formatDateTime(date: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date));
}

export function DevicesTable() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<string | null>(null);
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(
    null,
  );
  const [backingUpDeviceId, setBackingUpDeviceId] = useState<string | null>(
    null,
  );

  const paginated = devices.slice(
    (currentPage - 1) * TABLE_PAGE_SIZE,
    currentPage * TABLE_PAGE_SIZE,
  );

  const { execute: fetchDevices } = useAction(getMikrotikDevicesAction, {
    onSuccess: ({ data }) => {
      if (data?.success && data.data) {
        setDevices(data.data);
      }
      setIsLoading(false);
    },
    onError: () => {
      toast.error("Erro ao carregar equipamentos");
      setIsLoading(false);
    },
  });

  const { execute: deleteDevice } = useAction(deleteMikrotikDeviceAction, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success("Equipamento excluído com sucesso!");
        fetchDevices({});
        setDeleteDialogOpen(false);
        setDeviceToDelete(null);
      }
    },
    onError: () => {
      toast.error("Erro ao excluir equipamento");
    },
  });

  const { execute: connectDevice } = useAction(connectMikrotikDeviceAction, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success(
          data.identity
            ? `Conectado: ${data.identity} (${data.latencyMs}ms)`
            : `Conectado com sucesso (${data.latencyMs}ms)`,
        );
        fetchDevices({});
        window.dispatchEvent(new Event("device-changed"));
      } else if (data?.error) {
        toast.error(data.error);
        fetchDevices({});
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError || "Erro ao conectar equipamento");
    },
    onExecute: () => {},
    onSettled: () => {
      setConnectingDeviceId(null);
    },
  });

  const { execute: exportConfig } = useAction(exportMikrotikConfigAction, {
    onSuccess: async ({ data }) => {
      if (!data?.success || !data.snapshotId) return;

      toast.success("Backup gerado — iniciando download...");
      fetchDevices({});

      try {
        const response = await fetch(
          `/api/mikrotik/config-snapshot/${data.snapshotId}`,
        );

        if (!response.ok) {
          throw new Error("Falha ao baixar o arquivo");
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = data.fileName ?? "backup.rsc";
        link.rel = "noopener";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      } catch {
        toast.error("Backup salvo, mas o download automático falhou");
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Erro ao gerar backup");
    },
    onSettled: () => {
      setBackingUpDeviceId(null);
    },
  });

  useEffect(() => {
    fetchDevices({});
  }, [fetchDevices]);

  useEffect(() => {
    setCurrentPage(1);
  }, [devices.length]);

  useEffect(() => {
    const handleDeviceChanged = () => {
      fetchDevices({});
    };

    window.addEventListener("device-changed", handleDeviceChanged);
    return () => {
      window.removeEventListener("device-changed", handleDeviceChanged);
    };
  }, [fetchDevices]);

  const handleDeleteClick = (id: string) => {
    setDeviceToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (deviceToDelete) {
      deleteDevice({ id: deviceToDelete });
    }
  };

  const handleEdit = (device: Device) => {
    setEditingDevice(device);
    setEditDialogOpen(true);
  };

  const handleEditDialogClose = (open: boolean) => {
    setEditDialogOpen(open);
    if (!open) {
      setEditingDevice(null);
    }
  };

  const handleConnect = (device: Device) => {
    setConnectingDeviceId(device.id);
    connectDevice({ id: device.id });
  };

  const handleBackup = (device: Device) => {
    setBackingUpDeviceId(device.id);
    exportConfig({ deviceId: device.id });
  };

  if (isLoading) {
    return <div className="py-8 text-center">Carregando...</div>;
  }

  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-700">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Empresa / Local</TableHead>
            <TableHead>Host</TableHead>
            <TableHead>Conexão</TableHead>
            <TableHead>Online</TableHead>
            <TableHead>Última conexão</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px] text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {devices.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={8}
                className="text-muted-foreground py-8 text-center"
              >
                Nenhum equipamento cadastrado
              </TableCell>
            </TableRow>
          ) : (
            paginated.map((device) => (
              <TableRow key={device.id}>
                <TableCell className="font-medium">{device.name}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{device.companyName}</span>
                    <span className="text-muted-foreground text-xs">
                      {device.locationName}
                    </span>
                  </div>
                </TableCell>
                <TableCell>{device.host}</TableCell>
                <TableCell>
                  {device.apiSsl ? "SSL" : "TCP"}:{device.apiPort}
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      device.online
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    {device.online ? "Online" : "Offline"}
                  </span>
                </TableCell>
                <TableCell>{formatDateTime(device.lastSeen)}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      device.active
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    }`}
                  >
                    {device.active ? "Ativo" : "Inativo"}
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
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/configuracoes/gestao-equipamentos/${device.id}/acessar`}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Acessar
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleConnect(device)}
                        disabled={connectingDeviceId === device.id}
                      >
                        <Plug className="mr-2 h-4 w-4" />
                        {connectingDeviceId === device.id
                          ? "Conectando..."
                          : "Conectar"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleBackup(device)}
                        disabled={backingUpDeviceId === device.id}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        {backingUpDeviceId === device.id
                          ? "Gerando backup..."
                          : "Backup"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(device)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(device.id)}
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
        totalItems={devices.length}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        pageSize={TABLE_PAGE_SIZE}
      />

      <DeviceForm
        device={editingDevice}
        open={editDialogOpen}
        onOpenChange={handleEditDialogClose}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este equipamento? Esta ação não
              pode ser desfeita.
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
  );
}
