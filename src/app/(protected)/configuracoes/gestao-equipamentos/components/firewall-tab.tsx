"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

import { createDeviceFilterRuleAction } from "@/actions/create-device-filter-rule";
import { removeDeviceFilterRuleAction } from "@/actions/remove-device-filter-rule";
import { setFirewallRuleAction } from "@/actions/set-firewall-rule";
import { updateDeviceFilterRuleAction } from "@/actions/update-device-filter-rule";
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

type FilterChain = "all" | "input" | "forward" | "output";

type FilterFormState = {
  chain: "input" | "forward" | "output";
  action:
    | "accept"
    | "drop"
    | "reject"
    | "fasttrack-connection"
    | "log"
    | "jump"
    | "return"
    | "passthrough";
  protocol: "" | "tcp" | "udp" | "tcp-udp" | "icmp";
  srcAddress: string;
  dstAddress: string;
  srcPort: string;
  dstPort: string;
  inInterface: string;
  outInterface: string;
  connectionState: string;
  comment: string;
  disabled: boolean;
};

const FILTER_ACTIONS = [
  { value: "accept", label: "Accept" },
  { value: "drop", label: "Drop" },
  { value: "reject", label: "Reject" },
  { value: "fasttrack-connection", label: "FastTrack" },
  { value: "log", label: "Log" },
  { value: "jump", label: "Jump" },
  { value: "return", label: "Return" },
  { value: "passthrough", label: "Passthrough" },
] as const;

const CHAIN_TABS: Array<{ id: FilterChain; label: string }> = [
  { id: "all", label: "Todas" },
  { id: "input", label: "Input" },
  { id: "forward", label: "Forward" },
  { id: "output", label: "Output" },
];

const emptyForm = (chain: FilterFormState["chain"] = "input"): FilterFormState => ({
  chain,
  action: "accept",
  protocol: "",
  srcAddress: "",
  dstAddress: "",
  srcPort: "",
  dstPort: "",
  inInterface: "",
  outInterface: "",
  connectionState: "",
  comment: "",
  disabled: false,
});

function parseFilterChain(value?: string): FilterFormState["chain"] {
  if (value === "forward" || value === "output") return value;
  return "input";
}

function parseFilterAction(value?: string): FilterFormState["action"] {
  const found = FILTER_ACTIONS.find((item) => item.value === value);
  return found?.value ?? "accept";
}

function parseProtocol(value?: string): FilterFormState["protocol"] {
  if (value === "tcp" || value === "udp" || value === "tcp-udp" || value === "icmp") {
    return value;
  }
  return "";
}

function ruleToForm(rule: AccessFirewallRow): FilterFormState {
  return {
    chain: parseFilterChain(rule.chain),
    action: parseFilterAction(rule.action),
    protocol: parseProtocol(rule.protocol),
    srcAddress: rule.srcAddress ?? "",
    dstAddress: rule.dstAddress ?? "",
    srcPort: rule.srcPort ?? "",
    dstPort: rule.dstPort ?? "",
    inInterface: rule.inInterface ?? "",
    outInterface: rule.outInterface ?? "",
    connectionState: rule.connectionState ?? "",
    comment: rule.comment ?? "",
    disabled: rule.disabled,
  };
}

function formToPayload(form: FilterFormState) {
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
    connectionState: form.connectionState.trim() || undefined,
    comment: form.comment.trim() || undefined,
    disabled: form.disabled,
  };
}

function FilterFormFields({
  form,
  setForm,
  disabledLabel,
}: {
  form: FilterFormState;
  setForm: (next: FilterFormState) => void;
  disabledLabel: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="space-y-1.5">
        <Label>Chain</Label>
        <select
          className={selectClassName}
          value={form.chain}
          onChange={(e) =>
            setForm({
              ...form,
              chain: e.target.value as FilterFormState["chain"],
            })
          }
        >
          <option value="input">input</option>
          <option value="forward">forward</option>
          <option value="output">output</option>
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
              action: e.target.value as FilterFormState["action"],
            })
          }
        >
          {FILTER_ACTIONS.map((option) => (
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
              protocol: e.target.value as FilterFormState["protocol"],
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
          placeholder="192.168.1.0/24"
          className="font-mono"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Destino (dst-address)</Label>
        <Input
          value={form.dstAddress}
          onChange={(e) => setForm({ ...form, dstAddress: e.target.value })}
          placeholder="0.0.0.0/0"
          className="font-mono"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Porta origem (src-port)</Label>
        <Input
          value={form.srcPort}
          onChange={(e) => setForm({ ...form, srcPort: e.target.value })}
          className="font-mono"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Porta destino (dst-port)</Label>
        <Input
          value={form.dstPort}
          onChange={(e) => setForm({ ...form, dstPort: e.target.value })}
          className="font-mono"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Interface entrada (in-interface)</Label>
        <Input
          value={form.inInterface}
          onChange={(e) => setForm({ ...form, inInterface: e.target.value })}
          className="font-mono"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Interface saída (out-interface)</Label>
        <Input
          value={form.outInterface}
          onChange={(e) => setForm({ ...form, outInterface: e.target.value })}
          className="font-mono"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Connection state</Label>
        <Input
          value={form.connectionState}
          onChange={(e) =>
            setForm({ ...form, connectionState: e.target.value })
          }
          placeholder="established,related"
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
      <div className="flex items-center gap-2 self-end pb-2">
        <Checkbox
          id={`filter-disabled-${disabledLabel}`}
          checked={form.disabled}
          onCheckedChange={(v) => setForm({ ...form, disabled: v === true })}
        />
        <Label htmlFor={`filter-disabled-${disabledLabel}`}>
          {disabledLabel}
        </Label>
      </div>
    </div>
  );
}

type FirewallTabProps = {
  deviceId: string;
  rules: AccessFirewallRow[];
  onRefresh: () => void;
};

export function FirewallTab({
  deviceId,
  rules,
  onRefresh,
}: FirewallTabProps) {
  const [chainFilter, setChainFilter] = useState<FilterChain>("all");
  const [createForm, setCreateForm] = useState<FilterFormState>(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FilterFormState>(emptyForm());

  const filteredRules = useMemo(() => {
    if (chainFilter === "all") return rules;
    return rules.filter((rule) => rule.chain === chainFilter);
  }, [rules, chainFilter]);

  const { execute: createRule, isExecuting: creating } = useAction(
    createDeviceFilterRuleAction,
    {
      onSuccess: () => {
        toast.success("Regra de firewall criada");
        setCreateForm(emptyForm(chainFilter === "all" ? "input" : chainFilter));
        onRefresh();
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? "Falha ao criar regra");
      },
    },
  );

  const { execute: updateRule, isExecuting: updating } = useAction(
    updateDeviceFilterRuleAction,
    {
      onSuccess: () => {
        toast.success("Regra de firewall atualizada");
        setEditingId(null);
        onRefresh();
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? "Falha ao atualizar regra");
      },
    },
  );

  const { execute: removeRule, isExecuting: removing } = useAction(
    removeDeviceFilterRuleAction,
    {
      onSuccess: () => {
        toast.success("Regra de firewall removida");
        setEditingId(null);
        onRefresh();
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? "Falha ao remover regra");
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
    `${rule.chain ?? "filter"} ${rule.action ?? ""}`.trim();

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap gap-2">
        {CHAIN_TABS.map((tab) => (
          <Button
            key={tab.id}
            size="sm"
            variant={chainFilter === tab.id ? "default" : "outline"}
            onClick={() => {
              setChainFilter(tab.id);
              if (tab.id !== "all") {
                setCreateForm((current) => ({
                  ...current,
                  chain: tab.id as FilterFormState["chain"],
                }));
              }
            }}
          >
            {tab.label}
            {tab.id !== "all" && (
              <span className="ml-1.5 text-xs opacity-70">
                ({rules.filter((rule) => rule.chain === tab.id).length})
              </span>
            )}
          </Button>
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
        <h3 className="mb-3 text-sm font-semibold">Nova regra</h3>
        <FilterFormFields
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
          {creating ? "Criando..." : "Criar regra"}
        </Button>
      </div>

      {editingId && (
        <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
          <h3 className="mb-3 text-sm font-semibold">Editar regra</h3>
          <FilterFormFields
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

      {filteredRules.length === 0 ? (
        <p className="text-muted-foreground text-center text-sm">
          Nenhuma regra encontrada
          {chainFilter !== "all" ? ` na chain ${chainFilter}` : ""}
        </p>
      ) : (
        <div className="overflow-x-auto">
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
                <TableHead>In</TableHead>
                <TableHead>Out</TableHead>
                <TableHead>Conn. State</TableHead>
                <TableHead>Comentário</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRules.map((rule, index) => (
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
                    {rule.inInterface ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {rule.outInterface ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {rule.connectionState ?? "—"}
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
                          ruleType: "filter",
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
                              `Remover a regra de firewall "${ruleLabel(rule)}"?`,
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
        </div>
      )}
    </div>
  );
}
