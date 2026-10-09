"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Plug } from "lucide-react";
import { useForm, type Resolver } from "react-hook-form";
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
import { createDvrAction } from "@/actions/create-dvr";
import { updateDvrAction } from "@/actions/update-dvr";
import { testDvrConnectionAction } from "@/actions/test-dvr-connection";
import { getLocationsAction } from "@/actions/get-locations";
import { cn } from "@/lib/utils";

const hostPattern = /^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$/;

const optionalHostSchema = z
  .string()
  .trim()
  .regex(hostPattern, "Endereço inválido")
  .or(z.literal(""));

const portSchema = z.coerce
  .number()
  .int()
  .min(1, "Porta inválida")
  .max(65535, "Porta inválida");

const dvrFormSchema = z
  .object({
    locationId: z.string().uuid("Selecione um local"),
    name: z.string().trim().min(3, "O nome deve ter pelo menos 3 caracteres"),
    serialNumber: z.string().trim().min(1, "Informe o número de série"),
    ddns: optionalHostSchema,
    ip: optionalHostSchema,
    httpPort: portSchema,
    rtspPort: portSchema,
    username: z.string().trim().min(1, "Informe o usuário do DVR"),
    password: z.string().optional(),
    active: z.boolean(),
    notes: z.string().optional().or(z.literal("")),
  })
  .refine((data) => Boolean(data.ddns || data.ip), {
    message: "Informe o DDNS ou o IP do DVR",
    path: ["ddns"],
  });

type DvrFormValues = z.infer<typeof dvrFormSchema>;

type LocationOption = {
  id: string;
  name: string;
  companyName: string;
};

type Dvr = {
  id: string;
  locationId: string;
  name: string;
  serialNumber: string;
  ddns: string | null;
  ip: string | null;
  httpPort: number;
  rtspPort: number;
  username: string;
  active: boolean;
  notes: string | null;
};

type DvrFormProps = {
  dvr?: Dvr | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const defaultValues: DvrFormValues = {
  locationId: "",
  name: "",
  serialNumber: "",
  ddns: "",
  ip: "",
  httpPort: 80,
  rtspPort: 554,
  username: "",
  password: "",
  active: true,
  notes: "",
};

const inputClassName =
  "flex w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

const selectClassName = cn(
  "flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30",
);

export function DvrForm({
  dvr,
  open: controlledOpen,
  onOpenChange,
}: DvrFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const isEditMode = !!dvr;
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const form = useForm<DvrFormValues>({
    resolver: zodResolver(dvrFormSchema) as Resolver<DvrFormValues>,
    defaultValues,
  });

  const { execute: fetchLocations } = useAction(getLocationsAction, {
    onSuccess: ({ data }) => {
      if (data?.success && data.data) {
        setLocations(
          data.data.map((location) => ({
            id: location.id,
            name: location.name,
            companyName: location.companyName,
          })),
        );
      }
    },
  });

  useEffect(() => {
    if (open) {
      fetchLocations({});
    }
  }, [open, fetchLocations]);

  useEffect(() => {
    if (dvr && open) {
      form.reset({
        locationId: dvr.locationId,
        name: dvr.name,
        serialNumber: dvr.serialNumber,
        ddns: dvr.ddns ?? "",
        ip: dvr.ip ?? "",
        httpPort: dvr.httpPort,
        rtspPort: dvr.rtspPort,
        username: dvr.username,
        password: "",
        active: dvr.active,
        notes: dvr.notes ?? "",
      });
    } else if (!dvr && open) {
      form.reset(defaultValues);
    }
  }, [dvr, open, form]);

  const { execute: createDvr } = useAction(createDvrAction, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        if (data.syncError) {
          toast.warning(
            `DVR cadastrado, mas os canais não foram importados: ${data.syncError}`,
          );
        } else {
          toast.success(
            `DVR cadastrado com ${data.channelCount} câmeras importadas!`,
          );
        }
        form.reset(defaultValues);
        setOpen(false);
        window.dispatchEvent(new Event("dvr-changed"));
      } else if (data?.error) {
        toast.error(data.error);
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError || "Erro ao cadastrar DVR");
    },
    onExecute: () => setIsSubmitting(true),
    onSettled: () => setIsSubmitting(false),
  });

  const { execute: updateDvr } = useAction(updateDvrAction, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success("DVR atualizado com sucesso!");
        form.reset();
        setOpen(false);
        window.dispatchEvent(new Event("dvr-changed"));
      } else if (data?.error) {
        toast.error(data.error);
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError || "Erro ao atualizar DVR");
    },
    onExecute: () => setIsSubmitting(true),
    onSettled: () => setIsSubmitting(false),
  });

  const { execute: testConnection } = useAction(testDvrConnectionAction, {
    onSuccess: ({ data }) => {
      if (!data?.success) {
        toast.error(data?.error ?? "Falha ao conectar no DVR");
        return;
      }

      const summary = `Conectado${data.model ? ` (${data.model})` : ""}: ${data.channelCount} canais`;

      if (data.serialMatches) {
        toast.success(summary);
      } else {
        toast.warning(
          `${summary}. Atenção: o número de série do DVR (${data.serialNumber}) é diferente do informado.`,
        );
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError || "Erro ao testar conexão");
    },
    onExecute: () => setIsTesting(true),
    onSettled: () => setIsTesting(false),
  });

  const handleTestConnection = async () => {
    const isValid = await form.trigger([
      "ddns",
      "httpPort",
      "username",
      "password",
    ]);
    const values = form.getValues();

    if (!isValid) {
      return;
    }

    if (!isEditMode && !values.password) {
      form.setError("password", { message: "Informe a senha do DVR" });
      return;
    }

    testConnection({
      id: dvr?.id,
      ddns: values.ddns,
      ip: values.ip,
      httpPort: values.httpPort,
      username: values.username,
      password: values.password,
      serialNumber: values.serialNumber,
    });
  };

  const onSubmit = (data: DvrFormValues) => {
    const payload = {
      locationId: data.locationId,
      name: data.name,
      serialNumber: data.serialNumber,
      ddns: data.ddns,
      ip: data.ip,
      httpPort: data.httpPort,
      rtspPort: data.rtspPort,
      username: data.username,
      active: data.active,
      notes: data.notes || undefined,
    };

    if (isEditMode && dvr) {
      updateDvr({
        id: dvr.id,
        ...payload,
        ...(data.password ? { password: data.password } : {}),
      });
      return;
    }

    if (!data.password) {
      form.setError("password", { message: "Informe a senha do DVR" });
      return;
    }

    createDvr({ ...payload, password: data.password });
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      form.reset();
      setShowPassword(false);
    }
  };

  const dialogContent = (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[700px]">
      <DialogHeader>
        <DialogTitle>{isEditMode ? "Editar DVR" : "Cadastrar DVR"}</DialogTitle>
        <DialogDescription>
          {isEditMode
            ? "Altere os dados do DVR Intelbras"
            : "Preencha os dados de conexão do DVR Intelbras"}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Vínculo
            </h4>
            <FormField<DvrFormValues, "locationId">
              control={form.control}
              name="locationId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Local</FormLabel>
                  <FormControl>
                    <select
                      className={selectClassName}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                    >
                      <option value="">Selecione um local</option>
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.companyName} — {location.name}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Identificação
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <FormField<DvrFormValues, "name">
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: DVR Loja Centro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField<DvrFormValues, "serialNumber">
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de série (SN)</FormLabel>
                    <FormControl>
                      <Input placeholder="Número de série do DVR" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Conexão
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <FormField<DvrFormValues, "ddns">
                control={form.control}
                name="ddns"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>DDNS</FormLabel>
                    <FormControl>
                      <Input placeholder="dvr.exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField<DvrFormValues, "ip">
                control={form.control}
                name="ip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IP</FormLabel>
                    <FormControl>
                      <Input placeholder="200.200.200.200" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField<DvrFormValues, "httpPort">
                control={form.control}
                name="httpPort"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Porta HTTP</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={65535} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField<DvrFormValues, "rtspPort">
                control={form.control}
                name="rtspPort"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Porta RTSP</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={65535} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField<DvrFormValues, "username">
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuário</FormLabel>
                    <FormControl>
                      <Input placeholder="admin" autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField<DvrFormValues, "password">
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {isEditMode ? "Nova senha (opcional)" : "Senha"}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder={
                            isEditMode
                              ? "Deixe em branco para manter"
                              : "Senha de acesso ao DVR"
                          }
                          autoComplete="new-password"
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute top-0 right-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword((p) => !p)}
                          aria-label={
                            showPassword ? "Ocultar senha" : "Mostrar senha"
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="text-muted-foreground h-4 w-4" />
                          ) : (
                            <Eye className="text-muted-foreground h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting}
            >
              <Plug className="mr-2 h-4 w-4" />
              {isTesting ? "Testando..." : "Testar conexão"}
            </Button>
          </div>

          <FormField<DvrFormValues, "notes">
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observações</FormLabel>
                <FormControl>
                  <textarea
                    placeholder="Observações opcionais"
                    rows={2}
                    className={inputClassName}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField<DvrFormValues, "active">
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
                <FormLabel>DVR Ativo</FormLabel>
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
        <Button>Cadastrar DVR</Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
