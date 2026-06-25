import type { MikrotikRecord, MikrotikSession } from "../types";
import { fetchDhcpServers } from "../dhcp";
import { fetchDnsServices, fetchDnsSettingsRecord } from "../dns";
import { fetchNtpServices } from "../ntp";
import { fetchOpenVpnAccessData, fetchOpenVpnClients, type OpenVpnClientData } from "../openvpn";
import { fetchPppoeClients } from "../pppoe-client";
import { fetchFirewallFilterRules, fetchFirewallNatRules } from "../firewall";
import { fetchRouteList, type RouteData } from "../routes";
import {
  fetchBridgeAccessData,
  type BridgeAccessData,
} from "../bridge";
import { fetchCertificates, type CertificateData } from "../certificates";
import { fetchDeviceFiles, type MikrotikFileRow } from "../files";
import { fetchInterfaceList } from "../interfaces";
import {
  resolveInterfaceParents,
  type AccessInterfaceRow,
} from "./interface-list";
import { parseBool } from "../utils";

export type { AccessInterfaceRow };

export type AccessBridgePortRow = BridgeAccessData["bridges"][number]["ports"][number];
export type AccessBridgeRow = BridgeAccessData["bridges"][number];
export type AccessInterfaceOption = BridgeAccessData["availableInterfaces"][number];
export type AccessFileRow = MikrotikFileRow;
export type AccessOpenVpnClientRow = OpenVpnClientData;
export type AccessCertificateRow = CertificateData;

export type AccessAddressRow = {
  id: string;
  address: string;
  network?: string;
  interface?: string;
  disabled: boolean;
};

export type AccessDnsData = {
  id?: string;
  servers?: string;
  allowRemoteRequests: boolean;
  dynamicServers?: string;
};

export type AccessServiceRow = {
  key: string;
  label: string;
  status?: string;
  enabled: boolean;
  running: boolean;
  description?: string;
};

export type AccessRouteRow = RouteData;

export type AccessFirewallRow = {
  id: string;
  chain?: string;
  action?: string;
  srcAddress?: string;
  dstAddress?: string;
  protocol?: string;
  dstPort?: string;
  srcPort?: string;
  inInterface?: string;
  outInterface?: string;
  toAddresses?: string;
  toPorts?: string;
  connectionState?: string;
  comment?: string;
  disabled: boolean;
};

export type DeviceAccessData = {
  addresses: AccessAddressRow[];
  dns: AccessDnsData | null;
  services: AccessServiceRow[];
  firewall: AccessFirewallRow[];
  nat: AccessFirewallRow[];
  routes: AccessRouteRow[];
  bridges: AccessBridgeRow[];
  availableInterfaces: AccessInterfaceOption[];
  interfaces: AccessInterfaceRow[];
  files: AccessFileRow[];
  openVpn: {
    clients: AccessOpenVpnClientRow[];
    pppProfiles: string[];
    certificates: string[];
  };
  certificates: AccessCertificateRow[];
};

async function print(
  session: MikrotikSession,
  path: string,
  queries: string[] = [],
): Promise<MikrotikRecord[]> {
  return session.write(path, queries).catch(() => [] as MikrotikRecord[]);
}

function mapAddress(record: MikrotikRecord): AccessAddressRow | null {
  const id = record[".id"];
  if (!id || !record.address) return null;

  return {
    id,
    address: record.address,
    network: record.network,
    interface: record.interface,
    disabled: parseBool(record.disabled),
  };
}

function mapFirewallRule(record: MikrotikRecord): AccessFirewallRow | null {
  const id = record[".id"];
  if (!id) return null;

  return {
    id,
    chain: record.chain,
    action: record.action,
    srcAddress: record["src-address"],
    dstAddress: record["dst-address"],
    protocol: record.protocol,
    dstPort: record["dst-port"],
    srcPort: record["src-port"],
    inInterface: record["in-interface"],
    outInterface: record["out-interface"],
    toAddresses: record["to-addresses"],
    toPorts: record["to-ports"],
    connectionState: record["connection-state"],
    comment: record.comment,
    disabled: parseBool(record.disabled),
  };
}

export async function fetchDeviceAccessData(
  session: MikrotikSession,
): Promise<DeviceAccessData> {
  const [
    addressRecords,
    dnsServices,
    ntpServices,
    dhcpServers,
    pppoeClients,
    openVpnClients,
    firewall,
    nat,
    routes,
    bridgeData,
    fileRecords,
    openVpnData,
    certificateRecords,
    interfaceRecords,
  ] = await Promise.all([
    print(session, "/ip/address/print"),
    fetchDnsServices(session),
    fetchNtpServices(session),
    fetchDhcpServers(session),
    fetchPppoeClients(session),
    fetchOpenVpnClients(session),
    fetchFirewallFilterRules(session),
    fetchFirewallNatRules(session),
    fetchRouteList(session),
    fetchBridgeAccessData(session),
    fetchDeviceFiles(session),
    fetchOpenVpnAccessData(session),
    fetchCertificates(session),
    fetchInterfaceList(session),
  ]);

  const dnsSource = await fetchDnsSettingsRecord(session);
  const dnsRecord = dnsSource?.record;

  const addresses = addressRecords
    .map(mapAddress)
    .filter((row): row is AccessAddressRow => row !== null);

  const services: AccessServiceRow[] = [
    ...dhcpServers.map((s) => ({
      key: s.service,
      label: s.service,
      status: s.status,
      enabled: s.enabled,
      running: s.running,
      description: s.description,
    })),
    ...pppoeClients.map((s) => ({
      key: s.service,
      label: s.service,
      status: s.status,
      enabled: s.enabled,
      running: s.running,
      description: s.description,
    })),
    ...openVpnClients.map((s) => ({
      key: s.service,
      label: s.service,
      status: s.status,
      enabled: s.enabled,
      running: s.running,
      description: s.description,
    })),
    ...dnsServices.map((s) => ({
      key: s.service,
      label: s.service,
      status: s.status,
      enabled: s.enabled,
      running: s.running,
      description: s.description,
    })),
    ...ntpServices.map((s) => ({
      key: s.service,
      label: s.service,
      status: s.status,
      enabled: s.enabled,
      running: s.running,
      description: s.description,
    })),
  ];

  const bridgePorts = bridgeData.bridges.flatMap((bridge) => bridge.ports);
  const interfaces = resolveInterfaceParents(interfaceRecords, bridgePorts);

  return {
    addresses,
    dns: dnsRecord
      ? {
          id: dnsRecord[".id"],
          servers: dnsRecord.servers,
          allowRemoteRequests: parseBool(dnsRecord["allow-remote-requests"]),
          dynamicServers: dnsRecord["dynamic-servers"],
        }
      : null,
    services,
    firewall: firewall
      .map(mapFirewallRule)
      .filter((row): row is AccessFirewallRow => row !== null),
    nat: nat
      .map(mapFirewallRule)
      .filter((row): row is AccessFirewallRow => row !== null),
    routes,
    bridges: bridgeData.bridges,
    availableInterfaces: bridgeData.availableInterfaces,
    interfaces,
    files: fileRecords,
    openVpn: openVpnData,
    certificates: certificateRecords,
  };
}
