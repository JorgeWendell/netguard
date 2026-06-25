"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";

import { getDeviceAccessDataAction } from "@/actions/get-device-access-data";
import { updateDeviceAddressAction } from "@/actions/update-device-address";
import { updateDeviceDnsAction } from "@/actions/update-device-dns";
import { BridgeTab } from "./bridge-tab";
import { CertificatesTab } from "./certificates-tab";
import { FilesTab } from "./files-tab";
import { FirmwareTab } from "./firmware-tab";
import { FirewallTab } from "./firewall-tab";
import { InterfacesTab } from "./interfaces-tab";
import { OpenVpnTab } from "./openvpn-tab";
import { NatTab } from "./nat-tab";
import { RoutesTab } from "./routes-tab";
import type { DeviceAccessData } from "@/services/mikrotik/access/fetch-access-data";
import { formatServiceLabel } from "@/lib/services/format-service-label";
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

const TABS = [
  { id: "ip", label: "IP" },
  { id: "dns", label: "DNS" },
  { id: "services", label: "Serviços" },
  { id: "interfaces", label: "Interface List" },
  { id: "bridge", label: "Bridge" },
  { id: "files", label: "Arquivos" },
  { id: "openvpn", label: "OpenVPN" },
  { id: "certificates", label: "Certificados" },
  { id: "firmware", label: "Firmware" },
  { id: "firewall", label: "Firewall" },
  { id: "nat", label: "NAT" },
  { id: "routes", label: "Rotas" },
] as const;

type TabId = (typeof TABS)[number]["id"];

type DeviceAccessViewProps = {
  deviceId: string;
};

export function DeviceAccessView({ deviceId }: DeviceAccessViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>("ip");
  const [deviceName, setDeviceName] = useState("");
  const [deviceHost, setDeviceHost] = useState("");
  const [data, setData] = useState<DeviceAccessData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [dnsServers, setDnsServers] = useState("");
  const [dnsAllowRemote, setDnsAllowRemote] = useState(false);

  const { execute: loadAccess } = useAction(getDeviceAccessDataAction, {
    onSuccess: ({ data: result }) => {
      if (result?.success && result.data && result.device) {
        setData(result.data);
        setDeviceName(result.device.name);
        setDeviceHost(result.device.host);
        setDnsServers(result.data.dns?.servers ?? "");
        setDnsAllowRemote(result.data.dns?.allowRemoteRequests ?? false);
      } else {
        toast.error(result?.error ?? "Falha ao carregar dados do equipamento");
      }
      setIsLoading(false);
    },
    onError: ({ error }) => {
      toast.error(error.serverError ?? "Falha ao conectar no equipamento");
      setIsLoading(false);
    },
  });

  const refresh = useCallback(() => {
    setIsLoading(true);
    loadAccess({ deviceId });
  }, [deviceId, loadAccess]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const { execute: saveDns, isExecuting: savingDns } = useAction(
    updateDeviceDnsAction,
    {
      onSuccess: () => {
        toast.success("DNS atualizado");
        refresh();
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? "Falha ao salvar DNS");
      },
    },
  );

  const { execute: saveAddress, isExecuting: savingAddress } = useAction(
    updateDeviceAddressAction,
    {
      onSuccess: () => {
        toast.success("Endereço IP atualizado");
        refresh();
      },
      onError: ({ error }) => {
        toast.error(error.serverError ?? "Falha ao salvar endereço");
      },
    },
  );

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/configuracoes/gestao-equipamentos"
            className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para equipamentos
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {deviceName || "Equipamento"}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Acesso remoto via API — {deviceHost || "..."}
          </p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={isLoading}>
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          Atualizar
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" />
          Conectando e carregando...
        </div>
      ) : !data ? (
        <div className="py-20 text-center text-slate-500">
          Não foi possível carregar os dados.
        </div>
      ) : (
        <div className="rounded-md border border-slate-200 dark:border-slate-700">
          {activeTab === "ip" && (
            <IpTab data={data} deviceId={deviceId} onSave={saveAddress} saving={savingAddress} />
          )}
          {activeTab === "dns" && (
            <DnsTab
              servers={dnsServers}
              allowRemote={dnsAllowRemote}
              onServersChange={setDnsServers}
              onAllowRemoteChange={setDnsAllowRemote}
              onSave={() =>
                saveDns({
                  deviceId,
                  servers: dnsServers,
                  allowRemoteRequests: dnsAllowRemote,
                })
              }
              saving={savingDns}
            />
          )}
          {activeTab === "services" && <ServicesTab data={data} />}
          {activeTab === "interfaces" && (
            <InterfacesTab interfaces={data.interfaces} />
          )}
          {activeTab === "bridge" && (
            <BridgeTab
              deviceId={deviceId}
              bridges={data.bridges}
              availableInterfaces={data.availableInterfaces}
              onRefresh={refresh}
            />
          )}
          {activeTab === "files" && (
            <FilesTab
              deviceId={deviceId}
              files={data.files}
              onRefresh={refresh}
            />
          )}
          {activeTab === "openvpn" && (
            <OpenVpnTab
              deviceId={deviceId}
              clients={data.openVpn.clients}
              pppProfiles={data.openVpn.pppProfiles}
              certificates={data.openVpn.certificates}
              onRefresh={refresh}
            />
          )}
          {activeTab === "certificates" && (
            <CertificatesTab
              deviceId={deviceId}
              certificates={data.certificates}
              files={data.files}
              onRefresh={refresh}
            />
          )}
          {activeTab === "firmware" && <FirmwareTab deviceId={deviceId} />}
          {activeTab === "firewall" && (
            <FirewallTab
              deviceId={deviceId}
              rules={data.firewall}
              onRefresh={refresh}
            />
          )}
          {activeTab === "nat" && (
            <NatTab
              deviceId={deviceId}
              rules={data.nat}
              onRefresh={refresh}
            />
          )}
          {activeTab === "routes" && (
            <RoutesTab
              deviceId={deviceId}
              routes={data.routes}
              onRefresh={refresh}
            />
          )}
        </div>
      )}
    </div>
  );
}

function IpTab({
  data,
  deviceId,
  onSave,
  saving,
}: {
  data: DeviceAccessData;
  deviceId: string;
  onSave: (input: {
    deviceId: string;
    addressId: string;
    address: string;
  }) => void;
  saving: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  if (data.addresses.length === 0) {
    return (
      <p className="text-muted-foreground p-6 text-center">
        Nenhum endereço IP configurado
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Endereço</TableHead>
          <TableHead>Interface</TableHead>
          <TableHead>Rede</TableHead>
          <TableHead className="w-[140px]">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.addresses.map((row) => (
          <TableRow key={row.id}>
            <TableCell>
              {editingId === row.id ? (
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="h-8 font-mono text-sm"
                />
              ) : (
                <span className="font-mono text-sm">{row.address}</span>
              )}
            </TableCell>
            <TableCell>{row.interface ?? "—"}</TableCell>
            <TableCell className="font-mono text-sm">{row.network ?? "—"}</TableCell>
            <TableCell>
              {editingId === row.id ? (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={saving}
                    onClick={() => {
                      onSave({
                        deviceId,
                        addressId: row.id,
                        address: editValue,
                      });
                      setEditingId(null);
                    }}
                  >
                    Salvar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingId(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingId(row.id);
                    setEditValue(row.address);
                  }}
                >
                  Editar
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DnsTab({
  servers,
  allowRemote,
  onServersChange,
  onAllowRemoteChange,
  onSave,
  saving,
}: {
  servers: string;
  allowRemote: boolean;
  onServersChange: (v: string) => void;
  onAllowRemoteChange: (v: boolean) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <div className="space-y-4 p-6">
      <div className="space-y-1.5">
        <Label htmlFor="dns-servers">Servidores DNS</Label>
        <Input
          id="dns-servers"
          value={servers}
          onChange={(e) => onServersChange(e.target.value)}
          placeholder="8.8.8.8,8.8.4.4"
          className="font-mono"
        />
        <p className="text-muted-foreground text-xs">Separe múltiplos servidores por vírgula</p>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="dns-remote"
          checked={allowRemote}
          onCheckedChange={(v) => onAllowRemoteChange(v === true)}
        />
        <Label htmlFor="dns-remote">Permitir requisições remotas</Label>
      </div>
      <Button onClick={onSave} disabled={saving}>
        {saving ? "Salvando..." : "Salvar DNS"}
      </Button>
    </div>
  );
}

function ServicesTab({ data }: { data: DeviceAccessData }) {
  if (data.services.length === 0) {
    return (
      <p className="text-muted-foreground p-6 text-center">
        Nenhum serviço detectado
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Serviço</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Running</TableHead>
          <TableHead>Descrição</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.services.map((service) => (
          <TableRow key={service.key}>
            <TableCell className="font-medium">
              {formatServiceLabel(service.key)}
            </TableCell>
            <TableCell>{service.status ?? "—"}</TableCell>
            <TableCell>{service.running ? "Sim" : "Não"}</TableCell>
            <TableCell className="text-sm text-slate-600 dark:text-slate-400">
              {service.description ?? "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
