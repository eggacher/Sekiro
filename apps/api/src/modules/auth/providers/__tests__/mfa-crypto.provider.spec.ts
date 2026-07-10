import { describe, it, expect, beforeEach } from "vitest";
import { MfaCryptoProvider } from "../mfa-crypto.provider";

describe("MfaCryptoProvider", () => {
  let provider: MfaCryptoProvider;

  beforeEach(() => {
    process.env.MFA_SECRET_KEY = "test-mfa-key-32-bytes-long!!";
    provider = new MfaCryptoProvider();
  });

  it("should encrypt and decrypt a secret", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const encrypted = provider.encrypt(secret);
    expect(encrypted).toMatch(/^ENC\(/);
    expect(provider.decrypt(encrypted)).toBe(secret);
  });

  it("should produce different ciphertexts for the same secret", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const encrypted1 = provider.encrypt(secret);
    const encrypted2 = provider.encrypt(secret);
    expect(encrypted1).not.toBe(encrypted2);
    expect(provider.decrypt(encrypted1)).toBe(secret);
    expect(provider.decrypt(encrypted2)).toBe(secret);
  });

  it("should throw on invalid encrypted format", () => {
    expect(() => provider.decrypt("not-encrypted")).toThrow();
  });
});
