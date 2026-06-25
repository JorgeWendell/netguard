import "server-only";

import type {
  MikrotikDeviceCredentials,
  MikrotikRecord,
  MikrotikSession,
} from "./types";
import { readDeviceFile, removeDeviceFile } from "./files";
import { isUnknownParameterError } from "./utils";

const EXPORT_PARAM_VARIANTS: string[][] = [
  [],
  ["=hide-sensitive=yes"],
  ["=hide-sensitive=no"],
];

function buildFileExportVariants(fileName: string): string[][] {
  return [
    [`=file=${fileName}`],
    [`=file=${fileName}`, "=hide-sensitive=yes"],
    [`=file=${fileName}`, "=hide-sensitive=no"],
  ];
}

function collectExportLines(records: MikrotikRecord[]): string {
  const lines: string[] = [];

  for (const record of records) {
    if (typeof record.ret === "string" && record.ret.length > 0) {
      lines.push(record.ret);
    }
  }

  return lines.join("\n").trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function listDeviceFiles(
  session: MikrotikSession,
): Promise<MikrotikRecord[]> {
  return (await session
    .write("/file/print")
    .catch(() => [])) as MikrotikRecord[];
}

function findExportFileName(
  files: MikrotikRecord[],
  baseName: string,
): string | null {
  const target = `${baseName}.rsc`;

  for (const file of files) {
    const name = file.name;
    if (!name) continue;
    if (name === target || name.endsWith(`/${target}`)) {
      return name;
    }
  }

  return null;
}

async function tryDirectExport(session: MikrotikSession): Promise<string | null> {
  let lastError: unknown;

  for (const params of EXPORT_PARAM_VARIANTS) {
    try {
      const direct = (await session.write("/export", params)) as MikrotikRecord[];
      const text = collectExportLines(direct);
      if (text.length > 0) {
        return text;
      }
    } catch (error) {
      lastError = error;
      if (!isUnknownParameterError(error)) {
        throw error;
      }
    }
  }

  if (lastError instanceof Error && !isUnknownParameterError(lastError)) {
    throw lastError;
  }

  return null;
}

async function readExportViaFtp(
  credentials: MikrotikDeviceCredentials,
  fileName: string,
): Promise<string> {
  const { downloadViaFtpFromDevice } = await import("./files-ftp");
  const buffer = await downloadViaFtpFromDevice(credentials, fileName);
  const text = buffer.toString("utf8").trim();

  if (!text) {
    throw new Error("Exportação via FTP retornou vazia");
  }

  return text;
}

async function readExportFileContent(
  session: MikrotikSession,
  credentials: MikrotikDeviceCredentials | undefined,
  fileName: string,
): Promise<string> {
  try {
    const buffer = await readDeviceFile(session, fileName);
    const text = buffer.toString("utf8").trim();
    if (text) return text;
  } catch {
    // fallback FTP abaixo
  }

  if (!credentials) {
    throw new Error("Não foi possível ler o arquivo de exportação");
  }

  return readExportViaFtp(credentials, fileName);
}

async function tryFileExport(
  session: MikrotikSession,
  credentials: MikrotikDeviceCredentials | undefined,
  baseName: string,
): Promise<string | null> {
  let exportStarted = false;
  let lastError: unknown;

  for (const params of buildFileExportVariants(baseName)) {
    try {
      await session.write("/export", params);
      exportStarted = true;
      break;
    } catch (error) {
      lastError = error;
      if (!isUnknownParameterError(error)) {
        throw error;
      }
    }
  }

  if (!exportStarted) {
    if (lastError instanceof Error) throw lastError;
    return null;
  }

  let remoteFile: string | null = null;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (attempt > 0) {
      await sleep(500);
    }

    const files = await listDeviceFiles(session);
    remoteFile = findExportFileName(files, baseName);
    if (remoteFile) break;
  }

  if (!remoteFile) {
    return null;
  }

  try {
    const content = await readExportFileContent(
      session,
      credentials,
      remoteFile,
    );
    await removeDeviceFile(session, remoteFile).catch(() => undefined);
    return content;
  } catch (error) {
    await removeDeviceFile(session, remoteFile).catch(() => undefined);
    throw error;
  }
}

export async function exportDeviceConfig(
  session: MikrotikSession,
  credentials?: MikrotikDeviceCredentials,
): Promise<string> {
  const direct = await tryDirectExport(session);
  if (direct) {
    return direct;
  }

  const fileName = `netguard-${Date.now()}`;
  const fromFile = await tryFileExport(session, credentials, fileName);

  if (fromFile) {
    return fromFile;
  }

  throw new Error(
    "Não foi possível gerar o arquivo de exportação. Verifique permissões do usuário API e se o serviço FTP está habilitado no MikroTik.",
  );
}
