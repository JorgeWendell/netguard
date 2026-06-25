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
import { getCompaniesAction } from "@/actions/get-companies";
import { deleteCompanyAction } from "@/actions/delete-company";
import { CompanyForm } from "./company-form";

type Company = {
  id: string;
  name: string;
  cnpj: string | null;
  contact: string | null;
  whatsapp: string | null;
  email: string | null;
  active: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function CompaniesTable() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);

  const paginated = companies.slice(
    (currentPage - 1) * TABLE_PAGE_SIZE,
    currentPage * TABLE_PAGE_SIZE,
  );

  const { execute: fetchCompanies } = useAction(getCompaniesAction, {
    onSuccess: ({ data }) => {
      if (data?.success && data.data) {
        setCompanies(data.data);
      }
      setIsLoading(false);
    },
    onError: () => {
      toast.error("Erro ao carregar empresas");
      setIsLoading(false);
    },
  });

  const { execute: deleteCompany } = useAction(deleteCompanyAction, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success("Empresa excluída com sucesso!");
        fetchCompanies({});
        setDeleteDialogOpen(false);
        setCompanyToDelete(null);
      } else if (data?.error) {
        toast.error(data.error);
      }
    },
    onError: () => {
      toast.error("Erro ao excluir empresa");
    },
  });

  useEffect(() => {
    fetchCompanies({});
  }, [fetchCompanies]);

  useEffect(() => {
    setCurrentPage(1);
  }, [companies.length]);

  useEffect(() => {
    const handleCompanyChanged = () => {
      fetchCompanies({});
    };

    window.addEventListener("company-changed", handleCompanyChanged);
    return () => {
      window.removeEventListener("company-changed", handleCompanyChanged);
    };
  }, [fetchCompanies]);

  const handleDeleteClick = (id: string) => {
    setCompanyToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (companyToDelete) {
      deleteCompany({ id: companyToDelete });
    }
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setEditDialogOpen(true);
  };

  const handleEditDialogClose = (open: boolean) => {
    setEditDialogOpen(open);
    if (!open) {
      setEditingCompany(null);
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
            <TableHead>Nome</TableHead>
            <TableHead>CNPJ</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead>E-mail</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px] text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={6}
                className="text-muted-foreground py-8 text-center"
              >
                Nenhuma empresa cadastrada
              </TableCell>
            </TableRow>
          ) : (
            paginated.map((company) => (
              <TableRow key={company.id}>
                <TableCell className="font-medium">{company.name}</TableCell>
                <TableCell>{company.cnpj ?? "—"}</TableCell>
                <TableCell>{company.contact ?? "—"}</TableCell>
                <TableCell>{company.email ?? "—"}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      company.active
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    }`}
                  >
                    {company.active ? "Ativa" : "Inativa"}
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
                      <DropdownMenuItem onClick={() => handleEdit(company)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteClick(company.id)}
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
        totalItems={companies.length}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        pageSize={TABLE_PAGE_SIZE}
      />

      <CompanyForm
        company={editingCompany}
        open={editDialogOpen}
        onOpenChange={handleEditDialogClose}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta empresa? Todos os locais
              vinculados também serão removidos. Esta ação não pode ser
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
