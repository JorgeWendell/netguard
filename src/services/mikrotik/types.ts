import type { RouterOSAPI } from "node-routeros";

export type MikrotikSession = RouterOSAPI;

export type MikrotikDeviceCredentials = {
  host: string;
  apiPort: number;
  apiSsl: boolean;
  username: string;
  password: string;
};

export type MikrotikRecord = Record<string, string>;

export type MikrotikSystemData = {
  identity?: string;
  boardName?: string;
  model?: string;
  serialNumber?: string;
  routerOsVersion?: string;
  architecture?: string;
  cpu?: string;
  cpuCount?: number;
  cpuFrequency?: number;
  totalMemory?: number;
  totalStorage?: number;
  license?: string;
  timezone?: string;
  cpuUsage?: number;
  memoryUsage?: number;
  freeMemory?: number;
  diskUsage?: number;
  freeDisk?: number;
  uptime?: string;
  temperature?: number;
  voltage?: number;
};

export type MikrotikInterfaceStats = {
  upload: number;
  download: number;
};

export type MikrotikInterfaceData = {
  interfaceId: string;
  name: string;
  type?: string;
  macAddress?: string;
  mtu?: number;
  actualMtu?: number;
  l2Mtu?: number;
  speed?: string;
  duplex?: string;
  running: boolean;
  enabled: boolean;
  slave: boolean;
  parentName?: string;
  rxBytes?: number;
  txBytes?: number;
  rxPackets?: number;
  txPackets?: number;
  rxErrors?: number;
  txErrors?: number;
  linkDowns?: number;
  comment?: string;
};

export type MikrotikServiceData = {
  service: string;
  description?: string;
  status?: string;
  enabled: boolean;
  running: boolean;
  version?: string;
  publicIp?: string;
  localIp?: string;
  interfaceName?: string;
};

export type MikrotikWanData = {
  interface: string;
  provider?: string;
  gateway?: string;
  localIp?: string;
  publicIp?: string;
  dns?: string;
  online: boolean;
  latencyMs?: number | null;
  packetLoss?: number | null;
  priority?: number;
  routingTable?: string;
};

export type MikrotikPollResult = MikrotikSystemData & {
  online: boolean;
  latencyMs: number;
  upload?: number;
  download?: number;
  activeUsers?: number;
  queueCount?: number;
  routerOsUpdatePending?: boolean;
  routerboardUpdatePending?: boolean;
  interfaces?: MikrotikInterfaceData[];
  services?: MikrotikServiceData[];
  wans?: MikrotikWanData[];
  error?: string;
};

export type UpdateDeviceOptions = {
  recordMetrics?: boolean;
  force?: boolean;
};
