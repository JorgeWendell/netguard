"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

import { createDeviceRouteAction } from "@/actions/create-device-route";
import { removeDeviceRouteAction } from "@/actions/remove-device-route";
import { setDeviceRouteAction } from "@/actions/set-device-route";
import { updateDeviceRouteAction } from "@/actions/update-device-route";
import type { AccessRouteRow } from "@/services/mikrotik/access/fetch-access-data";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const selectClassName = cn(
  "border-input bg-background ring-offset-background focus-visible:ring-ring flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm focus-visible:ring-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
);

type RouteFormState = {
  dstAddress: string;
  gateway: string;
  interface: string;
  distance: string;
  routingTable: string;
  checkGateway: "" | "ping" | "arp" | "none";
  prefSrc: string;
  comment: string;
  disabled: boolean;
};

const emptyForm = (): RouteFormState => ({
  dstAddress: "0.0.0.0/0",
  gateway: "",
  interface: "",
  distance: "1",
  routingTable: "main",
  checkGateway: "",
  prefSrc: "",
  comment: "",
  disabled: false,
});

function parseCheckGateway(value?: string): RouteFormState["checkGateway"] {
  if (value === "ping" || value === "arp" || value === "none") {
    return value;
  }
  return "";
}

function routeToForm(route: AccessRouteRow): RouteFormState {
  return {
    dstAddress: route.dstAddress ?? "0.0.0.0/0",
    gateway: route.gateway ?? "",
    interface: route.interface ?? "",
    distance:
      route.distance !== undefined ? String(route.distance) : "",
    routingTable: route.routingTable ?? "main",
    checkGateway: parseCheckGateway(route.checkGateway),
    prefSrc: route.prefSrc ?? "",
    comment: route.comment ?? "",
    disabled: route.disabled,
  };
}

function formToPayload(form: RouteFormState) {
  const distance = form.distance.trim()
    ? Number.parseInt(form.distance, 10)
    : undefined;

  return {
    dstAddress: form.dstAddress.trim(),
    gateway: form.gateway.trim() || undefined,
    interface: form.interface.trim() || undefined,
    distance: Number.isFinite(distance) ? distance : undefined,
    routingTable: form.routingTable.trim() || undefined,
    checkGateway: form.checkGateway,
    prefSrc: form.prefSrc.trim() || undefined,
    comment: form.comment.trim() || undefined,
    disabled: form.disabled,
  };
}

function RouteFormFields({
  form,
  setForm,
  disabledLabel,
}: {
  form: RouteFormState;
  setForm: (next: RouteFormState) => void;
  disabledLabel: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-1.5">
        <Label>Destino (dst-address) *</Label>
        <Input
          value={form.dstAddress}
          onChange={(e) => setForm({ ...form, dstAddress: e.target.value })}
          placeholder="0.0.0.0/0"
          className="font-mono"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Gateway</Label>
        <Input
          value={form.gateway}
          onChange={(e) => setForm({ ...form, gateway: e.target.value })}
          placeholder="192.168.1.1"
          className="font-mono"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Interface</Label>
        <Input
          value={form.interface}
          onChange={(e) => setForm({ ...form, interface: e.target.value })}
          placeholder="pppoe-out1"
          className="font-mono"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Distance (prioridade)</Label>
        <Input
          value={form.distance}
          onChange={(e) => setForm({ ...form, distance: e.target.value })}
          placeholder="1"
          className="font-mono"
          type="number"
          min={0}
          max={255}
        />
        <p className="text-muted-foreground text-xs">
          Menor distance = maior prioridade no failover
        </p>
      </div>
      <div className="space-y-1.5">
        <Label>Tabela de roteamento</Label>
        <Input
          value={form.routingTable}
          onChange={(e) => setForm({ ...form, routingTable: e.target.value })}
          placeholder="main"
          className="font-mono"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Check gateway</Label>
        <select
          className={selectClassName}
          value={form.checkGateway}
          onChange={(e) =>
            setForm({
              ...form,
              checkGateway: e.target.value as RouteFormState["checkGateway"],
            })
          }
        >
          <option value="">Padrão</option>
          <option value="ping">Ping</option>
          <option value="arp">ARP</option>
          <option value="none">Nenhum</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Origem preferida (pref-src)</Label>
        <Input
          value={form.prefSrc}
          onChange={(e) => setForm({ ...form, prefSrc: e.target.value })}
          placeholder="IP de origem"
          className="font-mono"
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Comentário</Label>
        <Input
          value={form.comment}
          onChange={(e) => setForm({ ...form, comment: e.target.value })}
          placeholder="WAN1, link backup..."
        />
      </div>
      <div className="flex items-center gap-2 self-end pb-2">
        <Checkbox
          id={`route-disabled-${disabledLabel}`}
          checked={form.disabled}
          onCheckedChange={(v) => setForm({ ...form, disabled: v === true })}
        />
        <Label htmlFor={`route-disabled-${disabledLabel}`}>
          {disabledLabel}
        </Label>
      </div>
    </div>
  );
}

function formatRouteStatus(route: AccessRouteRow): string {
  if (route.disabled) return "Desabilitada";
  if (route.inactive) return "Inativa";
  if (route.active) return "Ativa";
  return "—";
}

type RoutesTabProps = {
  deviceId: string;
  routes: AccessRouteRow[];
  onRefresh: () => void;
};

export function RoutesTab({ deviceId, routes, onRefresh }: RoutesTabProps) {
  const [createForm, setCreateForm] = useState<RouteFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<RouteFormState>(emptyForm);
  const [showDefaultsOnly, setShowDefaultsOnly] = useState(false);

  const { execute: createRoute, isExecuting: creating } = useAction(
    createDeviceRouteAction,
    {
      onSuccess: () => {
        toast.success("Rota criada");
        setCreateForm(emptyForm());
        onRefresh();
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? "Falha ao criar rota");
      },
    },
  );

  const { execute: updateRoute, isExecuting: updating } = useAction(
    updateDeviceRouteAction,
    {
      onSuccess: () => {
        toast.success("Rota atualizada");
        setEditingId(null);
        onRefresh();
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? "Falha ao atualizar rota");
      },
    },
  );

  const { execute: removeRoute, isExecuting: removing } = useAction(
    removeDeviceRouteAction,
    {
      onSuccess: () => {
        toast.success("Rota removida");
        setEditingId(null);
        onRefresh();
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? "Falha ao remover rota");
      },
    },
  );

  const { execute: toggleRoute, isExecuting: toggling } = useAction(
    setDeviceRouteAction,
    {
      onSuccess: () => {
        toast.success("Rota atualizada");
        onRefresh();
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? "Falha ao alterar rota");
      },
    },
  );

  const visibleRoutes = useMemo(() => {
    if (!showDefaultsOnly) return routes;
    return routes.filter((route) => route.dstAddress === "0.0.0.0/0");
  }, [routes, showDefaultsOnly]);

  const startEdit = (route: AccessRouteRow) => {
    setEditingId(route.id);
    setEditForm(routeToForm(route));
  };

  const routeLabel = (route: AccessRouteRow) =>
    route.comment?.trim() ||
    `${route.dstAddress ?? "?"} via ${route.gateway ?? route.interface ?? "?"}`;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          Gerencie rotas estáticas e default routes para load balance e failover.
        </p>
        <div className="flex items-center gap-2">
          <Checkbox
            id="routes-defaults-only"
            checked={showDefaultsOnly}
            onCheckedChange={(v) => setShowDefaultsOnly(v === true)}
          />
          <Label htmlFor="routes-defaults-only">
            Mostrar apenas default (0.0.0.0/0)
          </Label>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
        <h3 className="mb-3 text-sm font-semibold">Nova rota</h3>
        <RouteFormFields
          form={createForm}
          setForm={setCreateForm}
          disabledLabel="Criar desabilitada"
        />
        <Button
          className="mt-4"
          disabled={creating}
          onClick={() =>
            createRoute({
              deviceId,
              ...formToPayload(createForm),
            })
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          {creating ? "Criando..." : "Criar rota"}
        </Button>
      </div>

      {editingId && (
        <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <h3 className="mb-3 text-sm font-semibold">Editar rota</h3>
          <RouteFormFields
            form={editForm}
            setForm={setEditForm}
            disabledLabel="Rota desabilitada"
          />
          <div className="mt-4 flex gap-2">
            <Button
              disabled={updating}
              onClick={() =>
                updateRoute({
                  deviceId,
                  routeId: editingId,
                  ...formToPayload(editForm),
                })
              }
            >
              {updating ? "Salvando..." : "Salvar alterações"}
            </Button>
            <Button variant="ghost" onClick={() => setEditingId(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {visibleRoutes.length === 0 ? (
        <p className="text-muted-foreground text-center text-sm">
          {showDefaultsOnly
            ? "Nenhuma rota default (0.0.0.0/0) configurada"
            : "Nenhuma rota configurada"}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Gateway</TableHead>
              <TableHead>Interface</TableHead>
              <TableHead>Distance</TableHead>
              <TableHead>Tabela</TableHead>
              <TableHead>Check GW</TableHead>
              <TableHead>Comentário</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRoutes.map((route, index) => (
              <TableRow
                key={route.id}
                className={cn(
                  route.disabled && "opacity-50",
                  route.dstAddress === "0.0.0.0/0" &&
                    "bg-slate-50/80 dark:bg-slate-900/40",
                )}
              >
                <TableCell>{index + 1}</TableCell>
                <TableCell className="font-mono text-xs">
                  {route.dstAddress ?? "—"}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {route.gateway ?? "—"}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {route.interface ?? "—"}
                </TableCell>
                <TableCell>{route.distance ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">
                  {route.routingTable ?? "main"}
                </TableCell>
                <TableCell>{route.checkGateway ?? "—"}</TableCell>
                <TableCell className="max-w-[160px] truncate text-sm">
                  {route.comment ?? "—"}
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      route.active &&
                        !route.disabled &&
                        "text-green-600 dark:text-green-400",
                      route.inactive &&
                        !route.disabled &&
                        "text-amber-600 dark:text-amber-400",
                    )}
                  >
                    {formatRouteStatus(route)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Button
                      size="sm"
                      variant={route.disabled ? "outline" : "secondary"}
                      disabled={toggling}
                      onClick={() =>
                        toggleRoute({
                          deviceId,
                          routeId: route.id,
                          disabled: !route.disabled,
                        })
                      }
                    >
                      {route.disabled ? "Ativar" : "Desativar"}
                    </Button>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => startEdit(route)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-600"
                        disabled={removing}
                        onClick={() => {
                          if (
                            confirm(`Remover a rota "${routeLabel(route)}"?`)
                          ) {
                            removeRoute({ deviceId, routeId: route.id });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
