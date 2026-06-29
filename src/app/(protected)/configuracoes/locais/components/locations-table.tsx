"use client";

import { useState, useEffect } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
import { getLocationsAction } from "@/actions/get-locations";
import { deleteLocationAction } from "@/actions/delete-location";
import { LocationForm } from "./location-form";

type Location = {
  id: string;
  companyId: string;
  companyName: string;
  name: string;
  contact: string | null;
  phone: string | null;
  address: string | null;
  number: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  active: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function LocationsTable() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<string | null>(null);

  const paginated = locations.slice(
    (currentPage - 1) * TABLE_PAGE_SIZE,
    currentPage * TABLE_PAGE_SIZE,
  );

  const { execute: fetchLocations } = useAction(getLocationsAction, {
    onSuccess: ({ data }) => {
      if (data?.success && data.data) {
        setLocations(data.data);
      }
      setIsLoading(false);
    },
    onError: () => {
      toast.error("Erro ao carregar locais");
      setIsLoading(false);
    },
  });

  const { execute: deleteLocation } = useAction(deleteLocationAction, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success("Local excluído com sucesso!");
        fetchLocations({});
        setDeleteDialogOpen(false);
        setLocationToDelete(null);
      } else if (data && "error" in data && data.error) {
        toast.error(String(data.error));
      }
    },
    onError: () => {
      toast.error("Erro ao excluir local");
    },
  });

  useEffect(() => {
    fetchLocations({});
  }, [fetchLocations]);

  useEffect(() => {
    setCurrentPage(1);
  }, [locations.length]);

  useEffect(() => {
    const handleLocationChanged = () => {
      fetchLocations({});
    };

    window.addEventListener("location-changed", handleLocationChanged);
    return () => {
      window.removeEventListener("location-changed", handleLocationChanged);
    };
  }, [fetchLocations]);

  const handleDeleteClick = (id: string) => {
    setLocationToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (locationToDelete) {
      deleteLocation({ id: locationToDelete });
    }
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setEditDialogOpen(true);
  };

  const handleEditDialogClose = (open: boolean) => {
    setEditDialogOpen(open);
    if (!open) {
      setEditingLocation(null);
    }
  };

  if (isLoading) {
    return <div className="py-8 text-center">Carregando...</div>;
  }

  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-700">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Empresa</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead>Cidade/UF</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px] text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {locations.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-muted-foreground py-8 text-center"
              >
                Nenhum local cadastrado
              </TableCell>
            </TableRow>
          ) : (
            paginated.map((location) => (
              <TableRow key={location.id}>
                <TableCell>{location.companyName}</TableCell>
                <TableCell className="font-medium">{location.name}</TableCell>
                <TableCell>{location.contact ?? "—"}</TableCell>
                <TableCell>
                  {location.city && location.state
                    ? `${location.city}/${location.state}`
                    : location.city || location.state || "—"}
                </TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      location.active
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    }`}
                  >
                    {location.active ? "Ativo" : "Inativo"}
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
                      <DropdownMenuItem onClick={() => handleEdit(location)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(location.id)}
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
        totalItems={locations.length}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        pageSize={TABLE_PAGE_SIZE}
      />

      <LocationForm
        location={editingLocation}
        open={editDialogOpen}
        onOpenChange={handleEditDialogClose}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este local? Esta ação não pode ser
              desfeita.
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
