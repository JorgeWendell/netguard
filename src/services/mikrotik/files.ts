import "server-only";

import { getAppBaseUrl } from "@/lib/mikrotik/get-app-base-url";
import {
  MAX_UPLOAD_BYTES,
  SMALL_FILE_MAX_BYTES,
} from "@/services/mikrotik/file-limits";
import type { MikrotikDeviceCredentials, MikrotikRecord, MikrotikSession } from "./types";
import { parseIntSafe } from "./utils";

export type MikrotikFileRow = {
  name: string;
  size?: number;
  type?: string;
  creationTime?: string;
};

function mapFile(record: MikrotikRecord): MikrotikFileRow | null {
  const name = record.name;
  if (!name) return null;

  return {
    name,
    size: parseIntSafe(record.size) ?? undefined,
    type: record.type,
    creationTime: record["creation-time"],
  };
}

function isUtf8Text(buffer: Buffer): boolean {
  if (buffer.length === 0) return true;

  try {
    const text = buffer.toString("utf8");
    return Buffer.from(text, "utf8").equals(buffer);
  } catch {
    return false;
  }
}

function sanitizeFileName(fileName: string): string {
  const base = fileName.split(/[/\\]/).pop()?.trim() ?? "";
  const sanitized = base.replace(/[^\w.\-()+ ]/g, "_");
  if (!sanitized || sanitized === "." || sanitized === "..") {
    throw new Error("Nome de arquivo inválido");
  }
  return sanitized;
}

export async function fetchDeviceFiles(
  session: MikrotikSession,
): Promise<MikrotikFileRow[]> {
  const records = (await session
    .write("/file/print")
    .catch(() => [])) as MikrotikRecord[];

  return records
    .map(mapFile)
    .filter((file): file is MikrotikFileRow => file !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function readDeviceFile(
  session: MikrotikSession,
  fileName: string,
): Promise<Buffer> {
  const safeName = sanitizeFileName(fileName);
  const chunks: string[] = [];
  let chunkIndex = 0;

  while (chunkIndex < 10_000) {
    const result = (await session.write("/file/read", [
      `=file=${safeName}`,
      `=chunk=${chunkIndex}`,
    ])) as MikrotikRecord[];

    const piece = result
      .map((record) => record.ret ?? record.contents ?? "")
      .join("");

    if (!piece) break;

    chunks.push(piece);
    chunkIndex += 1;

    if (piece.length < 2048) break;
  }

  if (chunks.length === 0) {
    throw new Error("Arquivo vazio ou não encontrado");
  }

  return Buffer.from(chunks.join(""), "binary");
}

export async function removeDeviceFile(
  session: MikrotikSession,
  fileName: string,
): Promise<void> {
  const safeName = sanitizeFileName(fileName);
  await session.write("/file/remove", [`=numbers=${safeName}`]);
}

export async function importDeviceRsc(
  session: MikrotikSession,
  fileName: string,
): Promise<void> {
  const safeName = sanitizeFileName(fileName);
  if (!safeName.toLowerCase().endsWith(".rsc")) {
    throw new Error("A importação suporta apenas arquivos .rsc");
  }

  await session.write("/import", [`=file-name=${safeName}`]);
}

async function uploadViaFileAdd(
  session: MikrotikSession,
  fileName: string,
  buffer: Buffer,
): Promise<void> {
  const contents = buffer.toString("utf8");
  await session.write("/file/add", [
    `=name=${fileName}`,
    `=contents=${contents}`,
  ]);
}

async function uploadViaFetch(
  session: MikrotikSession,
  fileName: string,
  stagingToken: string,
): Promise<void> {
  const baseUrl = getAppBaseUrl();
  const url = `${baseUrl}/api/mikrotik/upload-staging/${stagingToken}`;

  await session.write("/tool/fetch", [
    `=url=${url}`,
    `=dst-path=${fileName}`,
    "=mode=http",
    "=check-certificate=no",
  ]);

  const files = (await session
    .write("/file/print", [`?name=${fileName}`])
    .catch(() => [])) as MikrotikRecord[];

  if (files.length === 0) {
    throw new Error(
      "Fetch concluído mas arquivo não apareceu no roteador. Verifique se o MikroTik alcança a URL do NetGuard.",
    );
  }
}

export type UploadDeviceFileResult = {
  method: "api" | "fetch" | "ftp";
  fileName: string;
  size: number;
};

export async function uploadDeviceFile(
  session: MikrotikSession,
  credentials: MikrotikDeviceCredentials,
  originalFileName: string,
  buffer: Buffer,
  stagingToken?: string,
): Promise<UploadDeviceFileResult> {
  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new Error(
      `Arquivo excede o limite de ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))}MB`,
    );
  }

  const fileName = sanitizeFileName(originalFileName);
  const errors: string[] = [];

  if (buffer.length <= SMALL_FILE_MAX_BYTES && isUtf8Text(buffer)) {
    try {
      await uploadViaFileAdd(session, fileName, buffer);
      return { method: "api", fileName, size: buffer.length };
    } catch (error) {
      errors.push(
        error instanceof Error ? error.message : "Falha no upload via API",
      );
    }
  }

  if (stagingToken) {
    try {
      await uploadViaFetch(session, fileName, stagingToken);
      return { method: "fetch", fileName, size: buffer.length };
    } catch (error) {
      errors.push(
        error instanceof Error ? error.message : "Falha no upload via fetch",
      );
    }
  }

  try {
    const { uploadViaFtpToDevice } = await import("./files-ftp");
    await uploadViaFtpToDevice(credentials, fileName, buffer);
    return { method: "ftp", fileName, size: buffer.length };
  } catch (error) {
    errors.push(
      error instanceof Error ? error.message : "Falha no upload via FTP",
    );
  }

  throw new Error(
    errors.join(" · ") ||
      "Não foi possível enviar o arquivo. Verifique FTP no MikroTik e conectividade com o NetGuard.",
  );
}
