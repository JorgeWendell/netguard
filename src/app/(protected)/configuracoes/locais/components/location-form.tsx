"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
import { createLocationAction } from "@/actions/create-location";
import { updateLocationAction } from "@/actions/update-location";
import { getCompaniesAction } from "@/actions/get-companies";
import { fetchAddressByCep, formatCep, stripCep } from "@/lib/viacep";
import { cn } from "@/lib/utils";

const locationFormSchema = z.object({
  companyId: z.string().uuid("Selecione uma empresa"),
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  contact: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  zipCode: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  number: z.string().optional().or(z.literal("")),
  district: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  state: z.string().max(2, "Use a sigla do estado").optional().or(z.literal("")),
  active: z.boolean(),
  notes: z.string().optional().or(z.literal("")),
});

type LocationFormValues = z.infer<typeof locationFormSchema>;

type Company = {
  id: string;
  name: string;
};

type Location = {
  id: string;
  companyId: string;
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
};

type LocationFormProps = {
  location?: Location | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
};

const defaultValues: LocationFormValues = {
  companyId: "",
  name: "",
  contact: "",
  phone: "",
  zipCode: "",
  address: "",
  number: "",
  district: "",
  city: "",
  state: "",
  active: true,
  notes: "",
};

const selectClassName = cn(
  "flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30",
);

export function LocationForm({
  location,
  open: controlledOpen,
  onOpenChange,
  trigger,
}: LocationFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const isEditMode = !!location;
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues,
  });

  const { execute: fetchCompanies } = useAction(getCompaniesAction, {
    onSuccess: ({ data }) => {
      if (data?.success && data.data) {
        setCompanies(
          data.data.map((c) => ({ id: c.id, name: c.name })),
        );
      }
    },
  });

  useEffect(() => {
    if (open) {
      fetchCompanies({});
    }
  }, [open, fetchCompanies]);

  useEffect(() => {
    if (location && open) {
      form.reset({
        companyId: location.companyId,
        name: location.name,
        contact: location.contact ?? "",
        phone: location.phone ?? "",
        zipCode: location.zipCode ?? "",
        address: location.address ?? "",
        number: location.number ?? "",
        district: location.district ?? "",
        city: location.city ?? "",
        state: location.state ?? "",
        active: location.active,
        notes: location.notes ?? "",
      });
    } else if (!location && open) {
      form.reset(defaultValues);
    }
  }, [location, open, form]);

  const { execute: createLocation } = useAction(createLocationAction, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success("Local cadastrado com sucesso!");
        form.reset(defaultValues);
        setOpen(false);
        window.dispatchEvent(new Event("location-changed"));
      } else if (data?.error) {
        toast.error(data.error);
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError || "Erro ao cadastrar local");
    },
    onExecute: () => setIsSubmitting(true),
    onSettled: () => setIsSubmitting(false),
  });

  const { execute: updateLocation } = useAction(updateLocationAction, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success("Local atualizado com sucesso!");
        form.reset();
        setOpen(false);
        window.dispatchEvent(new Event("location-changed"));
      } else if (data?.error) {
        toast.error(data.error);
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError || "Erro ao atualizar local");
    },
    onExecute: () => setIsSubmitting(true),
    onSettled: () => setIsSubmitting(false),
  });

  const onSubmit = (data: LocationFormValues) => {
    const payload = {
      companyId: data.companyId,
      name: data.name,
      contact: data.contact || undefined,
      phone: data.phone || undefined,
      zipCode: data.zipCode || undefined,
      address: data.address || undefined,
      number: data.number || undefined,
      district: data.district || undefined,
      city: data.city || undefined,
      state: data.state || undefined,
      active: data.active,
      notes: data.notes || undefined,
    };

    if (isEditMode && location) {
      updateLocation({ id: location.id, ...payload });
    } else {
      createLocation(payload);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      form.reset();
    }
  };

  const handleCepBlur = async (cep: string) => {
    const digits = stripCep(cep);
    if (digits.length !== 8) return;

    setIsLoadingCep(true);
    try {
      const data = await fetchAddressByCep(cep);
      if (!data) {
        toast.error("CEP não encontrado");
        return;
      }

      form.setValue("zipCode", formatCep(data.cep), { shouldValidate: true });
      if (data.logradouro) {
        form.setValue("address", data.logradouro, { shouldValidate: true });
      }
      if (data.bairro) {
        form.setValue("district", data.bairro, { shouldValidate: true });
      }
      if (data.localidade) {
        form.setValue("city", data.localidade, { shouldValidate: true });
      }
      if (data.uf) {
        form.setValue("state", data.uf, { shouldValidate: true });
      }
    } catch {
      toast.error("Erro ao buscar CEP");
    } finally {
      setIsLoadingCep(false);
    }
  };

  const dialogContent = (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
      <DialogHeader>
        <DialogTitle>
          {isEditMode ? "Editar Local" : "Cadastrar Local"}
        </DialogTitle>
        <DialogDescription>
          {isEditMode
            ? "Altere os dados do local"
            : "Preencha os dados para cadastrar um novo local vinculado a uma empresa"}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField<LocationFormValues, "companyId">
            control={form.control}
            name="companyId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Empresa</FormLabel>
                <FormControl>
                  <select
                    className={selectClassName}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                  >
                    <option value="">Selecione uma empresa</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField<LocationFormValues, "name">
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Matriz, Filial SP..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField<LocationFormValues, "contact">
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
            <FormField<LocationFormValues, "phone">
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input placeholder="(00) 00000-0000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormField<LocationFormValues, "zipCode">
              control={form.control}
              name="zipCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CEP</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="00000-000"
                        maxLength={9}
                        {...field}
                        onChange={(e) =>
                          field.onChange(formatCep(e.target.value))
                        }
                        onBlur={(e) => {
                          field.onBlur();
                          handleCepBlur(e.target.value);
                        }}
                      />
                      {isLoadingCep && (
                        <Loader2 className="text-muted-foreground absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin" />
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField<LocationFormValues, "address">
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Endereço</FormLabel>
                  <FormControl>
                    <Input placeholder="Rua, Avenida..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormField<LocationFormValues, "number">
              control={form.control}
              name="number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número</FormLabel>
                  <FormControl>
                    <Input placeholder="123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField<LocationFormValues, "district">
              control={form.control}
              name="district"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Bairro</FormLabel>
                  <FormControl>
                    <Input placeholder="Centro" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField<LocationFormValues, "city">
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cidade</FormLabel>
                  <FormControl>
                    <Input placeholder="São Paulo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField<LocationFormValues, "state">
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <FormControl>
                    <Input placeholder="SP" maxLength={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField<LocationFormValues, "notes">
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
          <FormField<LocationFormValues, "active">
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
                  <FormLabel>Local Ativo</FormLabel>
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
        <Button>Cadastrar Local</Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
