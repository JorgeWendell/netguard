"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { createCompanyAction } from "@/actions/create-company";
import { updateCompanyAction } from "@/actions/update-company";
import { cn } from "@/lib/utils";

const companyFormSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  cnpj: z.string().optional().or(z.literal("")),
  contact: z.string().optional().or(z.literal("")),
  whatsapp: z.string().optional().or(z.literal("")),
  email: z
    .union([z.string().email("E-mail inválido"), z.literal("")])
    .optional(),
  active: z.boolean(),
  notes: z.string().optional().or(z.literal("")),
});

type CompanyFormValues = z.infer<typeof companyFormSchema>;

type Company = {
  id: string;
  name: string;
  cnpj: string | null;
  contact: string | null;
  whatsapp: string | null;
  email: string | null;
  active: boolean;
  notes: string | null;
};

type CompanyFormProps = {
  company?: Company | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
};

const defaultValues: CompanyFormValues = {
  name: "",
  cnpj: "",
  contact: "",
  whatsapp: "",
  email: "",
  active: true,
  notes: "",
};

function formatCnpj(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  }
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function CompanyForm({
  company,
  open: controlledOpen,
  onOpenChange,
  trigger,
}: CompanyFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!company;
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues,
  });

  useEffect(() => {
    if (company && open) {
      form.reset({
        name: company.name,
        cnpj: company.cnpj ?? "",
        contact: company.contact ?? "",
        whatsapp: company.whatsapp ?? "",
        email: company.email ?? "",
        active: company.active,
        notes: company.notes ?? "",
      });
    } else if (!company && open) {
      form.reset(defaultValues);
    }
  }, [company, open, form]);

  const { execute: createCompany } = useAction(createCompanyAction, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success("Empresa cadastrada com sucesso!");
        form.reset(defaultValues);
        setOpen(false);
        window.dispatchEvent(new Event("company-changed"));
      } else if (data && "error" in data && data.error) {
        toast.error(String(data.error));
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError || "Erro ao cadastrar empresa");
    },
    onExecute: () => setIsSubmitting(true),
    onSettled: () => setIsSubmitting(false),
  });

  const { execute: updateCompany } = useAction(updateCompanyAction, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success("Empresa atualizada com sucesso!");
        form.reset();
        setOpen(false);
        window.dispatchEvent(new Event("company-changed"));
      } else if (data && "error" in data && data.error) {
        toast.error(String(data.error));
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError || "Erro ao atualizar empresa");
    },
    onExecute: () => setIsSubmitting(true),
    onSettled: () => setIsSubmitting(false),
  });

  const onSubmit = (data: CompanyFormValues) => {
    const payload = {
      name: data.name,
      cnpj: data.cnpj || undefined,
      contact: data.contact || undefined,
      whatsapp: data.whatsapp || undefined,
      email: data.email || undefined,
      active: data.active,
      notes: data.notes || undefined,
    };

    if (isEditMode && company) {
      updateCompany({ id: company.id, ...payload });
    } else {
      createCompany(payload);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      form.reset();
    }
  };

  const dialogContent = (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>
          {isEditMode ? "Editar Empresa" : "Cadastrar Empresa"}
        </DialogTitle>
        <DialogDescription>
          {isEditMode
            ? "Altere os dados da empresa"
            : "Preencha os dados para cadastrar uma nova empresa"}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField<CompanyFormValues, "name">
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Empresa X Ltda" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField<CompanyFormValues, "cnpj">
              control={form.control}
              name="cnpj"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CNPJ</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="00.000.000/0000-00"
                      maxLength={18}
                      {...field}
                      onChange={(e) =>
                        field.onChange(formatCnpj(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField<CompanyFormValues, "contact">
              control={form.control}
              name="contact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contato</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do responsável" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField<CompanyFormValues, "whatsapp">
              control={form.control}
              name="whatsapp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp</FormLabel>
                  <FormControl>
                    <Input placeholder="(00) 00000-0000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField<CompanyFormValues, "email">
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="contato@empresa.com.br"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField<CompanyFormValues, "notes">
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observações</FormLabel>
                <FormControl>
                  <textarea
                    placeholder="Observações opcionais"
                    rows={3}
                    className={cn(
                      "flex w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30",
                    )}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField<CompanyFormValues, "active">
            control={form.control}
            name="active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Empresa Ativa</FormLabel>
                </div>
              </FormItem>
            )}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? isEditMode
                  ? "Atualizando..."
                  : "Cadastrando..."
                : isEditMode
                  ? "Atualizar"
                  : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );

  if (trigger) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        {dialogContent}
      </Dialog>
    );
  }

  if (controlledOpen !== undefined) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {dialogContent}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>Cadastrar Empresa</Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
