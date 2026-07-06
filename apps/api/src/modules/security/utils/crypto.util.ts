import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const SALT = "sekiro-config-encryption-salt";

function deriveKey(key: string): Buffer {
  // 优先接受 32 字节 base64 或 hex 字符串
  const fromBase64 = Buffer.from(key, "base64");
  if (fromBase64.length === KEY_LENGTH) {
    return fromBase64;
  }
  if (/^[a-f0-9]{64}$/i.test(key)) {
    return Buffer.from(key, "hex");
  }
  return scryptSync(key, SALT, KEY_LENGTH);
}

export function encryptConfig(plaintext: string, key: string): string {
  const keyBuffer = deriveKey(key);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, keyBuffer, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `ENC(${iv.toString("base64")}:${encrypted.toString("base64")}:${authTag.toString("base64")})`;
}

export function decryptConfig(ciphertext: string, key: string): string {
  const trimmed = ciphertext.trim();
  if (!trimmed.startsWith("ENC(") || !trimmed.endsWith(")")) {
    return trimmed;
  }
  const payload = trimmed.slice(4, -1);
  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted config format");
  }
  const [ivB64, cipherB64, authTagB64] = parts;
  const keyBuffer = deriveKey(key);
  const iv = Buffer.from(ivB64, "base64");
  const encrypted = Buffer.from(cipherB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");

  if (
    iv.length !== IV_LENGTH ||
    authTag.length !== AUTH_TAG_LENGTH
  ) {
    throw new Error("Invalid encrypted config format");
  }

  const decipher = createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
