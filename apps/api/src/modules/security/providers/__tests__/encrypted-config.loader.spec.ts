import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encryptedConfigLoader } from "../encrypted-config.loader";
import { encryptConfig } from "../../utils/crypto.util";

describe("encryptedConfigLoader", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should pass plain values through", () => {
    process.env.PLAIN_VAR = "plain-value";
    const config = encryptedConfigLoader();
    expect(config.PLAIN_VAR).toBe("plain-value");
  });

  it("should decrypt ENC values and mutate process.env", () => {
    const key = "test-key-that-is-exactly-32-bytes-long!!";
    process.env.CONFIG_ENCRYPTION_KEY = key;
    process.env.SECRET_VAR = encryptConfig("secret-value", key);
    const config = encryptedConfigLoader();
    expect(config.SECRET_VAR).toBe("secret-value");
    expect(process.env.SECRET_VAR).toBe("secret-value");
  });

  it("should throw if encryption key is missing for ENC value", () => {
    delete process.env.CONFIG_ENCRYPTION_KEY;
    process.env.SECRET_VAR = "ENC(abc:def:ghi)";
    expect(() => encryptedConfigLoader()).toThrow(/CONFIG_ENCRYPTION_KEY/);
  });
});
