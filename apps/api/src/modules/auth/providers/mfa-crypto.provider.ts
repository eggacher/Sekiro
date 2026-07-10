import { Injectable } from "@nestjs/common";
import {
  encryptConfig,
  decryptConfig,
} from "../../security/utils/crypto.util";

@Injectable()
export class MfaCryptoProvider {
  private readonly key: string;

  constructor() {
    const envKey = process.env.MFA_SECRET_KEY;
    if (!envKey) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("MFA_SECRET_KEY environment variable is required in production");
      }
      console.warn("[MfaCryptoProvider] MFA_SECRET_KEY not set, falling back to JWT_SECRET");
      this.key = process.env.JWT_SECRET || "your-secret-key";
    } else {
      this.key = envKey;
    }
  }

  encrypt(secret: string): string {
    return encryptConfig(secret, this.key);
  }

  decrypt(encrypted: string): string {
    const trimmed = encrypted.trim();
    if (!trimmed.startsWith("ENC(") || !trimmed.endsWith(")")) {
      throw new Error("Invalid encrypted config format");
    }
    return decryptConfig(encrypted, this.key);
  }
}
