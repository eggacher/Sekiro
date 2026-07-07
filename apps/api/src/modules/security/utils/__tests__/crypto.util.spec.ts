import { describe, it, expect } from "vitest";
import { encryptConfig, decryptConfig } from "../crypto.util";

describe("crypto.util", () => {
  const key = "test-key-that-is-exactly-32-bytes-long!!";

  it("should encrypt and decrypt plaintext", () => {
    const plain = "postgresql://sekiro:secret@localhost:5432/sekiro";
    const encrypted = encryptConfig(plain, key);
    expect(encrypted).toMatch(/^ENC\(.+\)$/);
    const decrypted = decryptConfig(encrypted, key);
    expect(decrypted).toBe(plain);
  });

  it("should return non-ENC value unchanged", () => {
    expect(decryptConfig("plain-value", key)).toBe("plain-value");
  });

  it("should throw on invalid encrypted format", () => {
    expect(() => decryptConfig("ENC(bad)", key)).toThrow();
  });

  it("should throw on tampered auth tag", () => {
    const encrypted = encryptConfig("secret", key);
    const tampered = encrypted.replace(/:[^:)]+\)$/, ":badtag)");
    expect(() => decryptConfig(tampered, key)).toThrow();
  });
});
