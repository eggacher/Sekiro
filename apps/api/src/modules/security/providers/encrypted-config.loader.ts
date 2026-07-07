import { decryptConfig } from "../utils/crypto.util";

export const encryptedConfigLoader = (): Record<string, string> => {
  const decrypted: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined) continue;
    if (value.startsWith("ENC(") && value.endsWith(")")) {
      const encryptionKey = process.env.CONFIG_ENCRYPTION_KEY;
      if (!encryptionKey) {
        throw new Error(
          `CONFIG_ENCRYPTION_KEY is required to decrypt environment variable ${key}`,
        );
      }
      const plain = decryptConfig(value, encryptionKey);
      decrypted[key] = plain;
      process.env[key] = plain;
    } else {
      decrypted[key] = value;
    }
  }
  return decrypted;
};
