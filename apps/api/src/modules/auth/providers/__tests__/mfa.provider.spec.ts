import { describe, it, expect, beforeEach } from "vitest";
import { MfaProvider } from "../mfa.provider";
import * as speakeasy from "speakeasy";

function generateToken(secret: string, step: number = 0): string {
  // Use speakeasy directly in test to generate a known-good token
  return speakeasy.totp({
    secret,
    encoding: "base32",
    step: 30,
    time: Math.floor(Date.now() / 30000) * 30 + step,
  });
}

describe("MfaProvider", () => {
  let provider: MfaProvider;

  beforeEach(() => {
    provider = new MfaProvider();
  });

  it("should generate a base32 secret", () => {
    const secret = provider.generateSecret();
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(secret.length).toBeGreaterThanOrEqual(32);
  });

  it("should return an otpauth URL", () => {
    const secret = "JBSWY3DPEHPK3PXP";
    const url = provider.getOtpauthUrl(secret, "admin");
    expect(url).toContain("otpauth://totp/");
    expect(url).toContain("secret=JBSWY3DPEHPK3PXP");
    expect(url).toContain("issuer=Sekiro");
  });

  it("should verify a valid current TOTP code", () => {
    const secret = provider.generateSecret();
    const code = generateToken(secret);
    expect(provider.verify(secret, code)).toBe(true);
  });

  it("should reject an invalid code", () => {
    const secret = provider.generateSecret();
    expect(provider.verify(secret, "000000")).toBe(false);
  });

  it("should reject a code outside the allowed window", () => {
    const secret = provider.generateSecret();
    const oldCode = generateToken(secret, -120); // 2 minutes ago
    expect(provider.verify(secret, oldCode, 1)).toBe(false);
  });
});
