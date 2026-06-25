"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

import { addDeviceBridgePortAction } from "@/actions/add-device-bridge-port";
import { createDeviceBridgeAction } from "@/actions/create-device-bridge";
import { removeDeviceBridgeAction } from "@/actions/remove-device-bridge";
import { removeDeviceBridgePortAction } from "@/actions/remove-device-bridge-port";
import { updateDeviceBridgeAction } from "@/actions/update-device-bridge";
import type {
  AccessBridgeRow,
  AccessInterfaceOption,
} from "@/services/mikrotik/access/fetch-access-data";
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

type BridgeTabProps = {
  deviceId: string;
  bridges: AccessBridgeRow[];
  availableInterfaces: AccessInterfaceOption[];
  onRefresh: () => void;
};

export function BridgeTab({
  deviceId,
  bridges,
  availableInterfaces,
  onRefresh,
}: BridgeTabProps) {
  const [selectedBridgeId, setSelectedBridgeId] = useState<string | null>(
    bridges[0]?.id ?? null,
  );
  const [newName, setNewName] = useState("");
  const [newComment, setNewComment] = useState("");
  const [newVlanFiltering, setNewVlanFiltering] = useState(false);
  const [portInterface, setPortInterface] = useState("");
  const [editingBridgeId, setEditingBridgeId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editComment, setEditComment] = useState("");
  const [editVlanFiltering, setEditVlanFiltering] = useState(false);
  const [editDisabled, setEditDisabled] = useState(false);

  const selectedBridge =
    bridges.find((bridge) => bridge.id === selectedBridgeId) ?? null;

  const actionCallbacks = {
    onSuccess: () => {
      onRefresh();
    },
    onError: ({ error }: { error: { serverError?: string } }) => {
      toast.error(error.serverError ?? "Falha na operação");
    },
  };

  const { execute: createBridge, isExecuting: creating } = useAction(
    createDeviceBridgeAction,
    {
      ...actionCallbacks,
      onSuccess: () => {
        toast.success("Bridge criada");
        setNewName("");
        setNewComment("");
        setNewVlanFiltering(false);
        onRefresh();
      },
    },
  );

  const { execute: updateBridge, isExecuting: updating } = useAction(
    updateDeviceBridgeAction,
    {
      ...actionCallbacks,
      onSuccess: () => {
        toast.success("Bridge atualizada");
        setEditingBridgeId(null);
        onRefresh();
      },
    },
  );

  const { execute: removeBridge, isExecuting: removingBridge } = useAction(
    removeDeviceBridgeAction,
    {
      ...actionCallbacks,
      onSuccess: () => {
        toast.success("Bridge removida");
        setSelectedBridgeId(null);
        onRefresh();
      },
    },
  );

  const { execute: addPort, isExecuting: addingPort } = useAction(
    addDeviceBridgePortAction,
    {
      ...actionCallbacks,
      onSuccess: () => {
        toast.success("Interface adicionada à bridge");
        setPortInterface("");
        onRefresh();
      },
    },
  );

  const { execute: removePort, isExecuting: removingPort } = useAction(
    removeDeviceBridgePortAction,
    {
      ...actionCallbacks,
      onSuccess: () => {
        toast.success("Interface removida da bridge");
        onRefresh();
      },
    },
  );

  const startEdit = (bridge: AccessBridgeRow) => {
    setEditingBridgeId(bridge.id);
    setEditName(bridge.name);
    setEditComment(bridge.comment ?? "");
    setEditVlanFiltering(bridge.vlanFiltering);
    setEditDisabled(bridge.disabled);
  };

  const handleCreate = () => {
    if (!newName.trim()) {
      toast.error("Informe o nome da bridge");
      return;
    }

    createBridge({
      deviceId,
      name: newName.trim(),
      comment: newComment.trim() || undefined,
      vlanFiltering: newVlanFiltering,
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
        <h3 className="mb-3 text-sm font-semibold">Nova bridge</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="bridge-name">Nome</Label>
            <Input
              id="bridge-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="bridge-lan"
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bridge-comment">Comentário</Label>
            <Input
              id="bridge-comment"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Opcional"
            />
          </div>
          <div className="flex items-end gap-2 pb-2">
            <Checkbox
              id="bridge-vlan"
              checked={newVlanFiltering}
              onCheckedChange={(v) => setNewVlanFiltering(v === true)}
            />
            <Label htmlFor="bridge-vlan">VLAN filtering</Label>
          </div>
          <div className="flex items-end">
            <Button onClick={handleCreate} disabled={creating}>
              <Plus className="mr-2 h-4 w-4" />
              {creating ? "Criando..." : "Criar bridge"}
            </Button>
          </div>
        </div>
      </div>

      {bridges.length === 0 ? (
        <p className="text-muted-foreground text-center">
          Nenhuma bridge configurada
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold">Bridges</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Portas</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[120px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bridges.map((bridge) => (
                  <TableRow
                    key={bridge.id}
                    className={cn(
                      "cursor-pointer",
                      selectedBridgeId === bridge.id && "bg-slate-50 dark:bg-slate-800/50",
                      bridge.disabled && "opacity-60",
                    )}
                    onClick={() => setSelectedBridgeId(bridge.id)}
                  >
                    <TableCell className="font-mono font-medium">
                      {bridge.name}
                    </TableCell>
                    <TableCell>{bridge.ports.length}</TableCell>
                    <TableCell>
                      {bridge.disabled ? "Desabilitada" : "Ativa"}
                    </TableCell>
                    <TableCell>
                      <div
                        className="flex gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => startEdit(bridge)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-600"
                          disabled={removingBridge}
                          onClick={() => {
                            if (
                              confirm(
                                `Remover a bridge "${bridge.name}" e todas as portas?`,
                              )
                            ) {
                              removeBridge({
                                deviceId,
                                bridgeId: bridge.id,
                                bridgeName: bridge.name,
                              });
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

          <div>
            {editingBridgeId && (
              <div className="mb-4 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                <h3 className="mb-3 text-sm font-semibold">Editar bridge</h3>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-bridge-name">Nome</Label>
                    <Input
                      id="edit-bridge-name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-bridge-comment">Comentário</Label>
                    <Input
                      id="edit-bridge-comment"
                      value={editComment}
                      onChange={(e) => setEditComment(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="edit-bridge-vlan"
                        checked={editVlanFiltering}
                        onCheckedChange={(v) =>
                          setEditVlanFiltering(v === true)
                        }
                      />
                      <Label htmlFor="edit-bridge-vlan">VLAN filtering</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="edit-bridge-disabled"
                        checked={editDisabled}
                        onCheckedChange={(v) => setEditDisabled(v === true)}
                      />
                      <Label htmlFor="edit-bridge-disabled">Desabilitada</Label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={updating}
                      onClick={() =>
                        updateBridge({
                          deviceId,
                          bridgeId: editingBridgeId,
                          name: editName.trim(),
                          comment: editComment,
                          vlanFiltering: editVlanFiltering,
                          disabled: editDisabled,
                        })
                      }
                    >
                      {updating ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingBridgeId(null)}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {selectedBridge ? (
              <div>
                <h3 className="mb-2 text-sm font-semibold">
                  Portas — {selectedBridge.name}
                </h3>

                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label htmlFor="port-interface">Adicionar interface</Label>
                    <select
                      id="port-interface"
                      className={selectClassName}
                      value={portInterface}
                      onChange={(e) => setPortInterface(e.target.value)}
                    >
                      <option value="">Selecione uma interface</option>
                      {availableInterfaces.map((iface) => (
                        <option key={iface.name} value={iface.name}>
                          {iface.name}
                          {iface.type ? ` (${iface.type})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    disabled={!portInterface || addingPort}
                    onClick={() =>
                      addPort({
                        deviceId,
                        bridgeName: selectedBridge.name,
                        interfaceName: portInterface,
                      })
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {addingPort ? "Adicionando..." : "Adicionar"}
                  </Button>
                </div>

                {selectedBridge.ports.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    Nenhuma interface nesta bridge
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Interface</TableHead>
                        <TableHead>PVID</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead className="w-[80px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedBridge.ports.map((port) => (
                        <TableRow
                          key={port.id}
                          className={port.disabled ? "opacity-50" : ""}
                        >
                          <TableCell className="font-mono">
                            {port.interface}
                          </TableCell>
                          <TableCell>{port.pvid ?? "—"}</TableCell>
                          <TableCell>{port.priority ?? "—"}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={removingPort}
                              onClick={() => {
                                if (
                                  confirm(
                                    `Remover ${port.interface} da bridge ${selectedBridge.name}?`,
                                  )
                                ) {
                                  removePort({
                                    deviceId,
                                    portId: port.id,
                                  });
                                }
                              }}
                            >
                              Remover
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                Selecione uma bridge para gerenciar portas
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
