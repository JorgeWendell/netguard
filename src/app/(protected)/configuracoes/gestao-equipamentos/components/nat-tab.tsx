"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

import { createDeviceNatRuleAction } from "@/actions/create-device-nat-rule";
import { removeDeviceNatRuleAction } from "@/actions/remove-device-nat-rule";
import { setFirewallRuleAction } from "@/actions/set-firewall-rule";
import { updateDeviceNatRuleAction } from "@/actions/update-device-nat-rule";
import type { AccessFirewallRow } from "@/services/mikrotik/access/fetch-access-data";
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

type NatFormState = {
  chain: "srcnat" | "dstnat";
  action: "masquerade" | "dst-nat" | "src-nat" | "accept" | "redirect";
  protocol: "" | "tcp" | "udp" | "tcp-udp" | "icmp";
  srcAddress: string;
  dstAddress: string;
  srcPort: string;
  dstPort: string;
  inInterface: string;
  outInterface: string;
  toAddresses: string;
  toPorts: string;
  comment: string;
  disabled: boolean;
};

const NAT_ACTIONS = [
  "masquerade",
  "dst-nat",
  "src-nat",
  "accept",
  "redirect",
] as const;

const SRCNAT_ACTIONS = [
  { value: "masquerade", label: "Masquerade" },
  { value: "src-nat", label: "Src-NAT" },
  { value: "accept", label: "Accept" },
] as const;

const DSTNAT_ACTIONS = [
  { value: "dst-nat", label: "Dst-NAT" },
  { value: "redirect", label: "Redirect" },
  { value: "accept", label: "Accept" },
] as const;

const emptyForm = (): NatFormState => ({
  chain: "dstnat",
  action: "dst-nat",
  protocol: "tcp",
  srcAddress: "",
  dstAddress: "",
  srcPort: "",
  dstPort: "",
  inInterface: "",
  outInterface: "",
  toAddresses: "",
  toPorts: "",
  comment: "",
  disabled: false,
});

function parseNatAction(
  value?: string,
  chain?: string,
): NatFormState["action"] {
  if (value && NAT_ACTIONS.includes(value as (typeof NAT_ACTIONS)[number])) {
    return value as NatFormState["action"];
  }
  return chain === "srcnat" ? "masquerade" : "dst-nat";
}

function parseNatProtocol(value?: string): NatFormState["protocol"] {
  if (value === "tcp" || value === "udp" || value === "tcp-udp" || value === "icmp") {
    return value;
  }
  return "";
}

function ruleToForm(rule: AccessFirewallRow): NatFormState {
  const chain = rule.chain === "srcnat" ? "srcnat" : "dstnat";

  return {
    chain,
    action: parseNatAction(rule.action, chain),
    protocol: parseNatProtocol(rule.protocol),
    srcAddress: rule.srcAddress ?? "",
    dstAddress: rule.dstAddress ?? "",
    srcPort: rule.srcPort ?? "",
    dstPort: rule.dstPort ?? "",
    inInterface: rule.inInterface ?? "",
    outInterface: rule.outInterface ?? "",
    toAddresses: rule.toAddresses ?? "",
    toPorts: rule.toPorts ?? "",
    comment: rule.comment ?? "",
    disabled: rule.disabled,
  };
}

function formToPayload(form: NatFormState) {
  return {
    chain: form.chain,
    action: form.action,
    protocol: form.protocol,
    srcAddress: form.srcAddress.trim() || undefined,
    dstAddress: form.dstAddress.trim() || undefined,
    srcPort: form.srcPort.trim() || undefined,
    dstPort: form.dstPort.trim() || undefined,
    inInterface: form.inInterface.trim() || undefined,
    outInterface: form.outInterface.trim() || undefined,
    toAddresses: form.toAddresses.trim() || undefined,
    toPorts: form.toPorts.trim() || undefined,
    comment: form.comment.trim() || undefined,
    disabled: form.disabled,
  };
}

function formatToTarget(rule: AccessFirewallRow): string {
  const parts = [rule.toAddresses, rule.toPorts].filter(Boolean);
  return parts.length > 0 ? parts.join(":") : "—";
}

function NatFormFields({
  form,
  setForm,
  disabledLabel,
}: {
  form: NatFormState;
  setForm: (next: NatFormState) => void;
  disabledLabel: string;
}) {
  const actionOptions =
    form.chain === "srcnat" ? SRCNAT_ACTIONS : DSTNAT_ACTIONS;

  const needsToAddresses =
    form.action === "dst-nat" || form.action === "src-nat";

  const handleChainChange = (chain: "srcnat" | "dstnat") => {
    setForm({
      ...form,
      chain,
      action: chain === "srcnat" ? "masquerade" : "dst-nat",
    });
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-1.5">
        <Label>Chain</Label>
        <select
          className={selectClassName}
          value={form.chain}
          onChange={(e) =>
            handleChainChange(e.target.value as "srcnat" | "dstnat")
          }
        >
          <option value="dstnat">dstnat (entrada / port forward)</option>
          <option value="srcnat">srcnat (saída / masquerade)</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Action</Label>
        <select
          className={selectClassName}
          value={form.action}
          onChange={(e) =>
            setForm({
              ...form,
              action: e.target.value as NatFormState["action"],
            })
          }
        >
          {actionOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Protocolo</Label>
        <select
          className={selectClassName}
          value={form.protocol}
          onChange={(e) =>
            setForm({
              ...form,
              protocol: e.target.value as NatFormState["protocol"],
            })
          }
        >
          <option value="">Qualquer</option>
          <option value="tcp">TCP</option>
          <option value="udp">UDP</option>
          <option value="tcp-udp">TCP+UDP</option>
          <option value="icmp">ICMP</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Origem (src-address)</Label>
        <Input
          value={form.srcAddress}
          onChange={(e) => setForm({ ...form, srcAddress: e.target.value })}
          placeholder="0.0.0.0/0"
          className="font-mono"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Destino (dst-address)</Label>
        <Input
          value={form.dstAddress}
          onChange={(e) => setForm({ ...form, dstAddress: e.target.value })}
          placeholder="IP público ou rede"
          className="font-mono"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Porta origem (src-port)</Label>
        <Input
          value={form.srcPort}
          onChange={(e) => setForm({ ...form, srcPort: e.target.value })}
          placeholder="1024-65535"
          className="font-mono"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Porta destino (dst-port)</Label>
        <Input
          value={form.dstPort}
          onChange={(e) => setForm({ ...form, dstPort: e.target.value })}
          placeholder="80,443"
          className="font-mono"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Interface entrada (in-interface)</Label>
        <Input
          value={form.inInterface}
          onChange={(e) => setForm({ ...form, inInterface: e.target.value })}
          placeholder="ether1"
          className="font-mono"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Interface saída (out-interface)</Label>
        <Input
          value={form.outInterface}
          onChange={(e) => setForm({ ...form, outInterface: e.target.value })}
          placeholder="pppoe-out1"
          className="font-mono"
        />
      </div>
      <div className="space-y-1.5">
        <Label>
          Redirecionar para (to-addresses)
          {needsToAddresses ? " *" : ""}
        </Label>
        <Input
          value={form.toAddresses}
          onChange={(e) => setForm({ ...form, toAddresses: e.target.value })}
          placeholder="192.168.1.10"
          className="font-mono"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Porta interna (to-ports)</Label>
        <Input
          value={form.toPorts}
          onChange={(e) => setForm({ ...form, toPorts: e.target.value })}
          placeholder="8080"
          className="font-mono"
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Comentário</Label>
        <Input
          value={form.comment}
          onChange={(e) => setForm({ ...form, comment: e.target.value })}
          placeholder="Descrição da regra"
        />
      </div>
      <div className="flex items-center gap-2 self-end pb-2">
        <Checkbox
          id={`nat-disabled-${disabledLabel}`}
          checked={form.disabled}
          onCheckedChange={(v) => setForm({ ...form, disabled: v === true })}
        />
        <Label htmlFor={`nat-disabled-${disabledLabel}`}>{disabledLabel}</Label>
      </div>
    </div>
  );
}

type NatTabProps = {
  deviceId: string;
  rules: AccessFirewallRow[];
  onRefresh: () => void;
};

export function NatTab({ deviceId, rules, onRefresh }: NatTabProps) {
  const [createForm, setCreateForm] = useState<NatFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<NatFormState>(emptyForm);

  const { execute: createRule, isExecuting: creating } = useAction(
    createDeviceNatRuleAction,
    {
      onSuccess: () => {
        toast.success("Regra NAT criada");
        setCreateForm(emptyForm());
        onRefresh();
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? "Falha ao criar regra NAT");
      },
    },
  );

  const { execute: updateRule, isExecuting: updating } = useAction(
    updateDeviceNatRuleAction,
    {
      onSuccess: () => {
        toast.success("Regra NAT atualizada");
        setEditingId(null);
        onRefresh();
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? "Falha ao atualizar regra NAT");
      },
    },
  );

  const { execute: removeRule, isExecuting: removing } = useAction(
    removeDeviceNatRuleAction,
    {
      onSuccess: () => {
        toast.success("Regra NAT removida");
        setEditingId(null);
        onRefresh();
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? "Falha ao remover regra NAT");
      },
    },
  );

  const { execute: toggleRule, isExecuting: toggling } = useAction(
    setFirewallRuleAction,
    {
      onSuccess: () => {
        toast.success("Regra atualizada");
        onRefresh();
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? "Falha ao alterar regra");
      },
    },
  );

  const startEdit = (rule: AccessFirewallRow) => {
    setEditingId(rule.id);
    setEditForm(ruleToForm(rule));
  };

  const ruleLabel = (rule: AccessFirewallRow) =>
    rule.comment?.trim() ||
    `${rule.chain ?? "nat"} ${rule.action ?? ""} ${rule.dstPort ?? ""}`.trim();

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
        <h3 className="mb-3 text-sm font-semibold">Nova regra NAT</h3>
        <NatFormFields
          form={createForm}
          setForm={setCreateForm}
          disabledLabel="Criar desabilitada"
        />
        <Button
          className="mt-4"
          disabled={creating}
          onClick={() =>
            createRule({
              deviceId,
              ...formToPayload(createForm),
            })
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          {creating ? "Criando..." : "Criar regra NAT"}
        </Button>
      </div>

      {editingId && (
        <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <h3 className="mb-3 text-sm font-semibold">Editar regra NAT</h3>
          <NatFormFields
            form={editForm}
            setForm={setEditForm}
            disabledLabel="Regra desabilitada"
          />
          <div className="mt-4 flex gap-2">
            <Button
              disabled={updating}
              onClick={() =>
                updateRule({
                  deviceId,
                  ruleId: editingId,
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

      {rules.length === 0 ? (
        <p className="text-muted-foreground text-center text-sm">
          Nenhuma regra NAT configurada
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Chain</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Proto</TableHead>
              <TableHead>Porta</TableHead>
              <TableHead>Para</TableHead>
              <TableHead>Comentário</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule, index) => (
              <TableRow
                key={rule.id}
                className={cn(rule.disabled && "opacity-50")}
              >
                <TableCell>{index + 1}</TableCell>
                <TableCell>{rule.chain ?? "—"}</TableCell>
                <TableCell>{rule.action ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">
                  {rule.srcAddress ?? "—"}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {rule.dstAddress ?? "—"}
                </TableCell>
                <TableCell>{rule.protocol ?? "—"}</TableCell>
                <TableCell>{rule.dstPort ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs">
                  {formatToTarget(rule)}
                </TableCell>
                <TableCell className="max-w-[160px] truncate text-sm">
                  {rule.comment ?? "—"}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant={rule.disabled ? "outline" : "secondary"}
                    disabled={toggling}
                    onClick={() =>
                      toggleRule({
                        deviceId,
                        ruleId: rule.id,
                        ruleType: "nat",
                        disabled: !rule.disabled,
                      })
                    }
                  >
                    {rule.disabled ? "Ativar" : "Desativar"}
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => startEdit(rule)}
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
                            `Remover a regra NAT "${ruleLabel(rule)}"?`,
                          )
                        ) {
                          removeRule({ deviceId, ruleId: rule.id });
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
