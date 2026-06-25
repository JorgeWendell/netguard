import type { MikrotikRecord, MikrotikSession } from "./types";
import { getFirstRecord } from "./utils";

export type PackageUpdateInfo = {
  channel?: string;
  installedVersion?: string;
  latestVersion?: string;
  status?: string;
};

export type RouterboardInfo = {
  model?: string;
  currentFirmware?: string;
  upgradeFirmware?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapPackageUpdate(record?: MikrotikRecord): PackageUpdateInfo {
  if (!record) return {};

  return {
    channel: record.channel,
    installedVersion: record["installed-version"],
    latestVersion: record["latest-version"],
    status: record.status,
  };
}

function mapRouterboard(record?: MikrotikRecord): RouterboardInfo {
  if (!record) return {};

  return {
    model: record.model,
    currentFirmware: record["current-firmware"],
    upgradeFirmware: record["upgrade-firmware"],
  };
}

export async function fetchPackageUpdateInfo(
  session: MikrotikSession,
): Promise<PackageUpdateInfo> {
  const records = (await session
    .write("/system/package/update/print")
    .catch(() => [])) as MikrotikRecord[];

  return mapPackageUpdate(getFirstRecord(records));
}

export async function fetchRouterboardInfo(
  session: MikrotikSession,
): Promise<RouterboardInfo> {
  const records = (await session
    .write("/system/routerboard/print")
    .catch(() => [])) as MikrotikRecord[];

  return mapRouterboard(getFirstRecord(records));
}

export async function setPackageUpdateChannel(
  session: MikrotikSession,
  channel: "stable" | "long-term" | "testing",
): Promise<void> {
  await session.write("/system/package/update/set", [`=channel=${channel}`]);
}

export async function checkPackageUpdates(
  session: MikrotikSession,
): Promise<PackageUpdateInfo> {
  await session.write("/system/package/update/check-for-updates");
  await sleep(2500);
  return fetchPackageUpdateInfo(session);
}

function isDownloadComplete(status?: string): boolean {
  if (!status) return false;
  const normalized = status.toLowerCase();
  return (
    normalized.includes("downloaded") ||
    normalized.includes("ready to install") ||
    normalized.includes("please reboot")
  );
}

function isUpdateError(status?: string): boolean {
  if (!status) return false;
  const normalized = status.toLowerCase();
  return (
    normalized.includes("error") ||
    normalized.includes("failed") ||
    normalized.includes("could not")
  );
}

function isUpToDate(status?: string, installed?: string, latest?: string): boolean {
  if (status?.toLowerCase().includes("already up to date")) {
    return true;
  }

  return Boolean(
    installed &&
      latest &&
      installed.trim() === latest.trim() &&
      !status?.toLowerCase().includes("available"),
  );
}

export async function downloadPackageUpdate(
  session: MikrotikSession,
  options?: { maxWaitMs?: number },
): Promise<PackageUpdateInfo> {
  const maxWaitMs = options?.maxWaitMs ?? 300_000;
  const infoBefore = await fetchPackageUpdateInfo(session);

  if (isUpToDate(infoBefore.status, infoBefore.installedVersion, infoBefore.latestVersion)) {
    return infoBefore;
  }

  if (!isDownloadComplete(infoBefore.status)) {
    await session.write("/system/package/update/download");
  }

  const startedAt = Date.now();

  while (Date.now() - startedAt < maxWaitMs) {
    await sleep(3000);
    const info = await fetchPackageUpdateInfo(session);

    if (isDownloadComplete(info.status)) {
      return info;
    }

    if (isUpdateError(info.status)) {
      throw new Error(info.status ?? "Falha ao baixar atualização");
    }
  }

  throw new Error(
    "Tempo esgotado aguardando o download da atualização no MikroTik",
  );
}

export async function installPackageUpdate(
  session: MikrotikSession,
): Promise<PackageUpdateInfo> {
  const infoBefore = await fetchPackageUpdateInfo(session);

  if (isUpToDate(infoBefore.status, infoBefore.installedVersion, infoBefore.latestVersion)) {
    return infoBefore;
  }

  if (!isDownloadComplete(infoBefore.status)) {
    throw new Error(
      "A atualização ainda não foi baixada. Baixe antes de instalar.",
    );
  }

  await session.write("/system/package/update/install");
  await sleep(2000);

  return fetchPackageUpdateInfo(session);
}

export async function upgradeRouterboardFirmware(
  session: MikrotikSession,
): Promise<RouterboardInfo> {
  await session.write("/system/routerboard/upgrade");
  await sleep(1500);
  return fetchRouterboardInfo(session);
}

export async function rebootDevice(session: MikrotikSession): Promise<void> {
  await session.write("/system/reboot");
}

export function hasRouterOsUpdateAvailable(info: PackageUpdateInfo): boolean {
  if (isUpToDate(info.status, info.installedVersion, info.latestVersion)) {
    return false;
  }

  if (!info.latestVersion || !info.installedVersion) {
    return false;
  }

  return info.installedVersion.trim() !== info.latestVersion.trim();
}

export function hasRouterboardUpgradeAvailable(info: RouterboardInfo): boolean {
  if (!info.upgradeFirmware || !info.currentFirmware) {
    return false;
  }

  return info.upgradeFirmware.trim() !== info.currentFirmware.trim();
}
