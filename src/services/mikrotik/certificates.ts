import type { MikrotikRecord, MikrotikSession } from "./types";
import {
  isUnknownParameterError,
  mikrotikSetWithFallback,
  parseBool,
} from "./utils";

export const CERTIFICATE_FILE_EXTENSIONS = [
  ".crt",
  ".cer",
  ".pem",
  ".key",
  ".p12",
  ".pfx",
  ".der",
] as const;

export type CertificateData = {
  id: string;
  name: string;
  commonName?: string;
  subject?: string;
  issuer?: string;
  trusted: boolean;
  hasPrivateKey: boolean;
  invalid: boolean;
  expired: boolean;
  expiryDate?: string;
  fingerprint?: string;
};

export type ImportCertificateInput = {
  name: string;
  certificateFileName: string;
  keyFileName?: string;
  passphrase?: string;
  trusted?: boolean;
};

export function isCertificateImportFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return CERTIFICATE_FILE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

function parseCertificateFlags(record: MikrotikRecord): {
  hasPrivateKey: boolean;
  trusted: boolean;
} {
  const flags = record.flags ?? "";

  return {
    hasPrivateKey: flags.includes("K") || parseBool(record["private-key"]),
    trusted: flags.includes("T") || parseBool(record.trusted),
  };
}

function mapCertificate(record: MikrotikRecord): CertificateData | null {
  const id = record[".id"];
  const name = record.name;
  if (!id || !name) return null;

  const { hasPrivateKey, trusted } = parseCertificateFlags(record);

  return {
    id,
    name,
    commonName: record["common-name"],
    subject: record.subject,
    issuer: record.issuer,
    trusted,
    hasPrivateKey,
    invalid: parseBool(record.invalid),
    expired: parseBool(record.expired),
    expiryDate: record["expires-after"] ?? record["expiry-date"],
    fingerprint: record.fingerprint,
  };
}

export async function fetchCertificates(
  session: MikrotikSession,
): Promise<CertificateData[]> {
  const records = (await session
    .write("/certificate/print")
    .catch(() => [])) as MikrotikRecord[];

  return records
    .map(mapCertificate)
    .filter(
      (certificate): certificate is CertificateData => certificate !== null,
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function importCertificateFile(
  session: MikrotikSession,
  fileName: string,
  name: string,
  passphrase?: string,
  trusted?: boolean,
): Promise<{ trustedApplied: boolean }> {
  const safePassphrase = passphrase?.trim() || undefined;
  const variants: string[][] = [];
  const fileParam = `=file-name=${fileName}`;
  const named = [fileParam, `=name=${name}`];
  const namedWithPass = safePassphrase
    ? [...named, `=passphrase=${safePassphrase}`]
    : named;

  if (trusted !== undefined) {
    variants.push([...namedWithPass, `=trusted=${trusted ? "yes" : "no"}`]);
  }

  variants.push(namedWithPass, named);

  if (safePassphrase) {
    variants.push([fileParam, `=passphrase=${safePassphrase}`]);
  }

  variants.push([fileParam]);

  const uniqueVariants = variants.filter(
    (variant, index, all) =>
      variant.length > 0 &&
      all.findIndex((other) => other.join() === variant.join()) === index,
  );

  let lastError: unknown;
  let usedParams: string[] = [];

  for (const params of uniqueVariants) {
    try {
      await session.write("/certificate/import", params);
      usedParams = params;
      break;
    } catch (error) {
      lastError = error;
      if (!isUnknownParameterError(error)) {
        throw error;
      }
    }
  }

  if (usedParams.length === 0) {
    throw lastError instanceof Error
      ? lastError
      : new Error("Não foi possível importar o certificado");
  }

  if (!usedParams.some((param) => param.startsWith("=name="))) {
    await alignCertificateName(session, fileName, name);
  }

  return {
    trustedApplied: usedParams.some((param) => param.startsWith("=trusted=")),
  };
}

async function alignCertificateName(
  session: MikrotikSession,
  fileName: string,
  desiredName: string,
): Promise<void> {
  const certificates = await fetchCertificates(session);
  const baseName = fileName.includes(".")
    ? fileName.slice(0, fileName.lastIndexOf("."))
    : fileName;

  const candidate = certificates.find(
    (certificate) =>
      certificate.name === fileName ||
      certificate.name === baseName ||
      certificate.name.startsWith(`${baseName}.`),
  );

  if (!candidate || candidate.name === desiredName) {
    return;
  }

  await mikrotikSetWithFallback(session, "/certificate/set", [
    [`=.id=${candidate.id}`, `=name=${desiredName}`],
  ]).catch(() => undefined);
}

async function ensureCertificatesTrusted(
  session: MikrotikSession,
  name: string,
): Promise<void> {
  const certificates = await fetchCertificates(session);
  const matches = certificates.filter(
    (certificate) => certificate.name === name,
  );

  for (const certificate of matches) {
    if (!certificate.trusted) {
      await setCertificateTrusted(session, certificate.id, true);
    }
  }
}

export async function importCertificate(
  session: MikrotikSession,
  input: ImportCertificateInput,
): Promise<void> {
  const trusted = input.trusted ?? true;
  const passphrase = input.passphrase?.trim() || undefined;

  const certResult = await importCertificateFile(
    session,
    input.certificateFileName,
    input.name,
    passphrase,
    trusted,
  );

  if (input.keyFileName && input.keyFileName !== input.certificateFileName) {
    const keyResult = await importCertificateFile(
      session,
      input.keyFileName,
      input.name,
      passphrase,
      trusted,
    );

    if (trusted && (!certResult.trustedApplied || !keyResult.trustedApplied)) {
      await ensureCertificatesTrusted(session, input.name);
    }
    return;
  }

  if (trusted && !certResult.trustedApplied) {
    await ensureCertificatesTrusted(session, input.name);
  }
}

export async function setCertificateTrusted(
  session: MikrotikSession,
  certificateId: string,
  trusted: boolean,
): Promise<void> {
  await mikrotikSetWithFallback(session, "/certificate/set", [
    [`=.id=${certificateId}`, `=trusted=${trusted ? "yes" : "no"}`],
  ]);
}

export async function removeCertificate(
  session: MikrotikSession,
  certificateId: string,
): Promise<void> {
  await session.write("/certificate/remove", [`=.id=${certificateId}`]);
}
