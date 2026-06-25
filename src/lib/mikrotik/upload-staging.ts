import { randomUUID } from "crypto";

type StagedUpload = {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  expiresAt: number;
};

const STAGING_TTL_MS = 15 * 60 * 1000;
const stagedUploads = new Map<string, StagedUpload>();

function purgeExpired() {
  const now = Date.now();
  for (const [token, entry] of stagedUploads) {
    if (entry.expiresAt <= now) {
      stagedUploads.delete(token);
    }
  }
}

export function stageUploadForFetch(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
): string {
  purgeExpired();

  const token = randomUUID();
  stagedUploads.set(token, {
    buffer,
    fileName,
    mimeType,
    expiresAt: Date.now() + STAGING_TTL_MS,
  });

  return token;
}

export function getStagedUpload(token: string): StagedUpload | null {
  purgeExpired();

  const entry = stagedUploads.get(token);
  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    stagedUploads.delete(token);
    return null;
  }

  return entry;
}

export function consumeStagedUpload(token: string): StagedUpload | null {
  const entry = getStagedUpload(token);
  if (entry) {
    stagedUploads.delete(token);
  }
  return entry;
}

export function releaseStagedUpload(token: string) {
  stagedUploads.delete(token);
}
