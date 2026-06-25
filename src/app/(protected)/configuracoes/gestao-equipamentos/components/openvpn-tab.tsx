"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

import { createDeviceOvpnClientAction } from "@/actions/create-device-ovpn-client";
import { removeDeviceOvpnClientAction } from "@/actions/remove-device-ovpn-client";
import { updateDeviceOvpnClientAction } from "@/actions/update-device-ovpn-client";
import type { AccessOpenVpnClientRow } from "@/services/mikrotik/access/fetch-access-data";
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

type OpenVpnFormState = {
  name: string;
  connectTo: string;
  port: string;
  mode: "ip" | "ethernet";
  user: string;
  password: string;
  profile: string;
  certificate: string;
  cipher: string;
  auth: string;
  comment: string;
  disabled: boolean;
  verifyServerCertificate: boolean;
  addDefaultRoute: boolean;
  routeNopull: boolean;
};

const emptyForm = (): OpenVpnFormState => ({
  name: "",
  connectTo: "",
  port: "1194",
  mode: "ip",
  user: "",
  password: "",
  profile: "default",
  certificate: "",
  cipher: "",
  auth: "",
  comment: "",
  disabled: false,
  verifyServerCertificate: false,
  addDefaultRoute: true,
  routeNopull: false,
});

function clientToForm(client: AccessOpenVpnClientRow): OpenVpnFormState {
  return {
    name: client.name,
    connectTo: client.connectTo ?? "",
    port: client.port ?? "1194",
    mode: client.mode === "ethernet" ? "ethernet" : "ip",
    user: client.user ?? "",
    password: "",
    profile: client.profile ?? "default",
    certificate: client.certificate ?? "",
    cipher: client.cipher ?? "",
    auth: client.auth ?? "",
    comment: client.comment ?? "",
    disabled: client.disabled,
    verifyServerCertificate: client.verifyServerCertificate,
    addDefaultRoute: client.addDefaultRoute,
    routeNopull: client.routeNopull,
  };
}

type OpenVpnTabProps = {
  deviceId: string;
  clients: AccessOpenVpnClientRow[];
  pppProfiles: string[];
  certificates: string[];
  onRefresh: () => void;
};

function OvpnFormFields({
  form,
  setForm,
  pppProfiles,
  certificates,
  isEdit,
}: {
  form: OpenVpnFormState;
  setForm: (next: OpenVpnFormState) => void;
  pppProfiles: string[];
  certificates: string[];
  isEdit?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label>Nome da interface</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="ovpn-cliente1"
          className="font-mono"
          disabled={isEdit}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Servidor</Label>
        <Input
          value={form.connectTo}
          onChange={(e) => setForm({ ...form, connectTo: e.target.value })}
          placeholder="vpn.exemplo.com"
          className="font-mono"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Porta</Label>
        <Input
          value={form.port}
          onChange={(e) => setForm({ ...form, port: e.target.value })}
          className="font-mono"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Modo</Label>
        <select
          className={selectClassName}
          value={form.mode}
          onChange={(e) =>
            setForm({
              ...form,
              mode: e.target.value as OpenVpnFormState["mode"],
            })
          }
        >
          <option value="ip">ip</option>
          <option value="ethernet">ethernet</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Usuário</Label>
        <Input
          value={form.user}
          onChange={(e) => setForm({ ...form, user: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Senha{isEdit ? " (vazio = manter)" : ""}</Label>
        <Input
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Perfil PPP</Label>
        <select
          className={selectClassName}
          value={form.profile}
          onChange={(e) => setForm({ ...form, profile: e.target.value })}
        >
          <option value="">—</option>
          {pppProfiles.map((profile) => (
            <option key={profile} value={profile}>
              {profile}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Certificado</Label>
        <select
          className={selectClassName}
          value={form.certificate}
          onChange={(e) => setForm({ ...form, certificate: e.target.value })}
        >
          <option value="">—</option>
          {certificates.map((certificate) => (
            <option key={certificate} value={certificate}>
              {certificate}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Cipher</Label>
        <Input
          value={form.cipher}
          onChange={(e) => setForm({ ...form, cipher: e.target.value })}
          placeholder="aes256"
          className="font-mono"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Auth</Label>
        <Input
          value={form.auth}
          onChange={(e) => setForm({ ...form, auth: e.target.value })}
          placeholder="sha256"
          className="font-mono"
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Comentário</Label>
        <Input
          value={form.comment}
          onChange={(e) => setForm({ ...form, comment: e.target.value })}
        />
      </div>
      <div className="flex flex-wrap gap-4 sm:col-span-2">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={form.disabled}
            onCheckedChange={(v) => setForm({ ...form, disabled: v === true })}
          />
          Desabilitado
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={form.verifyServerCertificate}
            onCheckedChange={(v) =>
              setForm({ ...form, verifyServerCertificate: v === true })
            }
          />
          Verificar certificado do servidor
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={form.addDefaultRoute}
            onCheckedChange={(v) =>
              setForm({ ...form, addDefaultRoute: v === true })
            }
          />
          Rota default
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={form.routeNopull}
            onCheckedChange={(v) =>
              setForm({ ...form, routeNopull: v === true })
            }
          />
          Não puxar rotas
        </label>
      </div>
    </div>
  );
}

function formToPayload(form: OpenVpnFormState, includePassword: boolean) {
  return {
    name: form.name.trim(),
    connectTo: form.connectTo.trim(),
    port: form.port.trim() || undefined,
    mode: form.mode,
    user: form.user.trim() || undefined,
    password:
      includePassword && form.password.trim()
        ? form.password
        : undefined,
    profile: form.profile.trim() || undefined,
    certificate: form.certificate.trim() || undefined,
    cipher: form.cipher.trim() || undefined,
    auth: form.auth.trim() || undefined,
    comment: form.comment,
    disabled: form.disabled,
    verifyServerCertificate: form.verifyServerCertificate,
    addDefaultRoute: form.addDefaultRoute,
    routeNopull: form.routeNopull,
  };
}

export function OpenVpnTab({
  deviceId,
  clients,
  pppProfiles,
  certificates,
  onRefresh,
}: OpenVpnTabProps) {
  const [createForm, setCreateForm] = useState<OpenVpnFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<OpenVpnFormState>(emptyForm);

  const { execute: createClient, isExecuting: creating } = useAction(
    createDeviceOvpnClientAction,
    {
      onSuccess: () => {
        toast.success("Cliente OpenVPN criado");
        setCreateForm(emptyForm());
        onRefresh();
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? "Falha ao criar cliente");
      },
    },
  );

  const { execute: updateClient, isExecuting: updating } = useAction(
    updateDeviceOvpnClientAction,
    {
      onSuccess: () => {
        toast.success("Cliente OpenVPN atualizado");
        setEditingId(null);
        onRefresh();
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? "Falha ao atualizar cliente");
      },
    },
  );

  const { execute: removeClient, isExecuting: removing } = useAction(
    removeDeviceOvpnClientAction,
    {
      onSuccess: () => {
        toast.success("Cliente OpenVPN removido");
        setEditingId(null);
        onRefresh();
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? "Falha ao remover cliente");
      },
    },
  );

  const startEdit = (client: AccessOpenVpnClientRow) => {
    setEditingId(client.id);
    setEditForm(clientToForm(client));
  };

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
        <h3 className="mb-3 text-sm font-semibold">Novo cliente OpenVPN</h3>
        <OvpnFormFields
          form={createForm}
          setForm={setCreateForm}
          pppProfiles={pppProfiles}
          certificates={certificates}
        />
        <Button
          className="mt-4"
          disabled={creating}
          onClick={() =>
            createClient({
              deviceId,
              ...formToPayload(createForm, true),
            })
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          {creating ? "Criando..." : "Criar cliente"}
        </Button>
      </div>

      {editingId && (
        <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <h3 className="mb-3 text-sm font-semibold">Editar cliente</h3>
          <OvpnFormFields
            form={editForm}
            setForm={setEditForm}
            pppProfiles={pppProfiles}
            certificates={certificates}
            isEdit
          />
          <div className="mt-4 flex gap-2">
            <Button
              disabled={updating}
              onClick={() =>
                updateClient({
                  deviceId,
                  clientId: editingId,
                  ...formToPayload(editForm, true),
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

      {clients.length === 0 ? (
        <p className="text-muted-foreground text-center text-sm">
          Nenhum cliente OpenVPN configurado
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Servidor</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((client) => (
              <TableRow
                key={client.id}
                className={cn(client.disabled && "opacity-60")}
              >
                <TableCell className="font-mono font-medium">
                  {client.name}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {client.connectTo ?? "—"}
                  {client.port ? `:${client.port}` : ""}
                </TableCell>
                <TableCell>{client.user ?? "—"}</TableCell>
                <TableCell>
                  {client.disabled
                    ? "Desabilitado"
                    : client.running
                      ? "Conectado"
                      : "Desconectado"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => startEdit(client)}
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
                          confirm(
                            `Remover o cliente OpenVPN "${client.name}"?`,
                          )
                        ) {
                          removeClient({ deviceId, clientId: client.id });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
