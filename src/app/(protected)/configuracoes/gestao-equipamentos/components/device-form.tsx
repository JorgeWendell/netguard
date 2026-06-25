"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff } from "lucide-react";
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
import { createMikrotikDeviceAction } from "@/actions/create-mikrotik-device";
import { updateMikrotikDeviceAction } from "@/actions/update-mikrotik-device";
import { getLocationsAction } from "@/actions/get-locations";
import { cn } from "@/lib/utils";

const deviceFormSchema = z.object({
  locationId: z.string().uuid("Selecione um local"),
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  description: z.string().optional().or(z.literal("")),
  host: z.string().min(1, "Informe o host ou IP"),
  apiPort: z.coerce
    .number()
    .int()
    .min(1, "Porta inválida")
    .max(65535, "Porta inválida"),
  apiSsl: z.boolean(),
  username: z.string().min(1, "Informe o usuário da API"),
  password: z
    .union([z.string().min(1, "Informe a senha da API"), z.literal("")])
    .optional(),
  monitoringEnabled: z.boolean(),
  alertsEnabled: z.boolean(),
  backupEnabled: z.boolean(),
  pollInterval: z.coerce
    .number()
    .int()
    .min(30, "Intervalo mínimo de 30 segundos")
    .max(3600, "Intervalo máximo de 3600 segundos"),
  active: z.boolean(),
  notes: z.string().optional().or(z.literal("")),
});

type DeviceFormValues = z.infer<typeof deviceFormSchema>;

type LocationOption = {
  id: string;
  name: string;
  companyName: string;
};

type Device = {
  id: string;
  locationId: string;
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
  active: boolean;
  notes: string | null;
};

type DeviceFormProps = {
  device?: Device | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
};

const defaultValues: DeviceFormValues = {
  locationId: "",
  name: "",
  description: "",
  host: "",
  apiPort: 8728,
  apiSsl: false,
  username: "",
  password: "",
  monitoringEnabled: true,
  alertsEnabled: true,
  backupEnabled: true,
  pollInterval: 60,
  active: true,
  notes: "",
};

const selectClassName = cn(
  "flex h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30",
);

export function DeviceForm({
  device,
  open: controlledOpen,
  onOpenChange,
  trigger,
}: DeviceFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const isEditMode = !!device;
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const form = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceFormSchema),
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
    if (device && open) {
      form.reset({
        locationId: device.locationId,
        name: device.name,
        description: device.description ?? "",
        host: device.host,
        apiPort: device.apiPort,
        apiSsl: device.apiSsl,
        username: device.username,
        password: "",
        monitoringEnabled: device.monitoringEnabled,
        alertsEnabled: device.alertsEnabled,
        backupEnabled: device.backupEnabled,
        pollInterval: device.pollInterval,
        active: device.active,
        notes: device.notes ?? "",
      });
    } else if (!device && open) {
      form.reset(defaultValues);
    }
  }, [device, open, form]);

  const { execute: createDevice } = useAction(createMikrotikDeviceAction, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success("Equipamento cadastrado com sucesso!");
        form.reset(defaultValues);
        setOpen(false);
        window.dispatchEvent(new Event("device-changed"));
      } else if (data?.error) {
        toast.error(data.error);
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError || "Erro ao cadastrar equipamento");
    },
    onExecute: () => setIsSubmitting(true),
    onSettled: () => setIsSubmitting(false),
  });

  const { execute: updateDevice } = useAction(updateMikrotikDeviceAction, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success("Equipamento atualizado com sucesso!");
        form.reset();
        setOpen(false);
        window.dispatchEvent(new Event("device-changed"));
      } else if (data?.error) {
        toast.error(data.error);
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError || "Erro ao atualizar equipamento");
    },
    onExecute: () => setIsSubmitting(true),
    onSettled: () => setIsSubmitting(false),
  });

  const onSubmit = (data: DeviceFormValues) => {
    const payload = {
      locationId: data.locationId,
      name: data.name,
      description: data.description || undefined,
      host: data.host,
      apiPort: data.apiPort,
      apiSsl: data.apiSsl,
      username: data.username,
      monitoringEnabled: data.monitoringEnabled,
      alertsEnabled: data.alertsEnabled,
      backupEnabled: data.backupEnabled,
      pollInterval: data.pollInterval,
      active: data.active,
      notes: data.notes || undefined,
    };

    if (isEditMode && device) {
      updateDevice({
        id: device.id,
        ...payload,
        ...(data.password ? { password: data.password } : {}),
      });
    } else {
      if (!data.password) {
        form.setError("password", {
          message: "Informe a senha da API",
        });
        return;
      }
      createDevice({ ...payload, password: data.password });
    }
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
        <DialogTitle>
          {isEditMode ? "Editar Equipamento" : "Cadastrar Equipamento"}
        </DialogTitle>
        <DialogDescription>
          {isEditMode
            ? "Altere os dados do roteador MikroTik"
            : "Preencha os dados de conexão do roteador MikroTik"}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Vínculo
            </h4>
            <FormField<DeviceFormValues, "locationId">
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
            <FormField<DeviceFormValues, "name">
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: RB750Gr3 Matriz" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField<DeviceFormValues, "description">
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <textarea
                      placeholder="Descrição opcional do equipamento"
                      rows={2}
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
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Conexão API
            </h4>
            <div className="grid grid-cols-3 gap-4">
              <FormField<DeviceFormValues, "host">
                control={form.control}
                name="host"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Host / IP</FormLabel>
                    <FormControl>
                      <Input placeholder="192.168.88.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField<DeviceFormValues, "apiPort">
                control={form.control}
                name="apiPort"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Porta API</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={65535} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField<DeviceFormValues, "username">
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuário API</FormLabel>
                    <FormControl>
                      <Input placeholder="admin" autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField<DeviceFormValues, "password">
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {isEditMode ? "Nova senha API (opcional)" : "Senha API"}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder={
                            isEditMode
                              ? "Deixe em branco para manter"
                              : "Senha de acesso à API"
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
            <FormField<DeviceFormValues, "apiSsl">
              control={form.control}
              name="apiSsl"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Usar SSL na API</FormLabel>
                    <p className="text-muted-foreground text-sm">
                      Porta padrão com SSL: 8729
                    </p>
                  </div>
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              Recursos
            </h4>
            <FormField<DeviceFormValues, "pollInterval">
              control={form.control}
              name="pollInterval"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Intervalo de polling (segundos)</FormLabel>
                  <FormControl>
                    <Input type="number" min={30} max={3600} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <FormField<DeviceFormValues, "monitoringEnabled">
                control={form.control}
                name="monitoringEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>Monitoramento</FormLabel>
                  </FormItem>
                )}
              />
              <FormField<DeviceFormValues, "alertsEnabled">
                control={form.control}
                name="alertsEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>Alertas</FormLabel>
                  </FormItem>
                )}
              />
              <FormField<DeviceFormValues, "backupEnabled">
                control={form.control}
                name="backupEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-y-0 space-x-3 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel>Backup</FormLabel>
                  </FormItem>
                )}
              />
            </div>
          </div>

          <FormField<DeviceFormValues, "notes">
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observações</FormLabel>
                <FormControl>
                  <textarea
                    placeholder="Observações opcionais"
                    rows={2}
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
          <FormField<DeviceFormValues, "active">
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
                <FormLabel>Equipamento Ativo</FormLabel>
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
        <Button>Cadastrar Equipamento</Button>
      </DialogTrigger>
      {dialogContent}
    </Dialog>
  );
}
