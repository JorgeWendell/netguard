import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

function getKey() {
  const raw = process.env.DVR_ENCRYPTION_KEY;

  if (!raw) {
    throw new Error(
      "Chave de criptografia dos DVRs não configurada (DVR_ENCRYPTION_KEY).",
    );
  }

  const key = Buffer.from(raw, "base64");

  if (key.length !== KEY_LENGTH) {
    throw new Error(
      "DVR_ENCRYPTION_KEY inválida: use 32 bytes codificados em base64.",
    );
  }

  return key;
}

export function encryptDvrPassword(plainText: string) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [iv, authTag, encrypted].map((part) => part.toString("base64")).join(":");
}

export function decryptDvrPassword(payload: string) {
  const [iv, authTag, encrypted] = payload
    .split(":")
    .map((part) => Buffer.from(part, "base64"));

  if (!iv || !authTag || !encrypted) {
    throw new Error("Senha criptografada do DVR em formato inválido.");
  }

  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}
