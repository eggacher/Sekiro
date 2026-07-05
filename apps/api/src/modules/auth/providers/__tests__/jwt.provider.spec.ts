import { describe, it, expect, beforeEach, vi } from "vitest";
import { JwtProvider } from "../jwt.provider";
import { TokenPayload, RefreshTokenPayload } from "../../types";

describe("JwtProvider", () => {
  let provider: JwtProvider;

  beforeEach(() => {
    provider = new JwtProvider({
      sign: vi.fn((payload, options) => "mock.token.string"),
      verify: vi.fn((token) => ({ sub: 1, username: "test" })),
    } as any);
  });

  describe("signToken", () => {
    it("should sign a token with 2h expiry", () => {
      const payload = { sub: 1, username: "admin", roles: ["admin"] };
      const result = provider.signToken(payload);
      expect(result.token).toBeDefined();
      expect(result.expiresIn).toBe(7200);
    });
  });

  describe("signRefreshToken", () => {
    it("should sign a refresh token with 30d expiry", () => {
      const payload = { sub: 1, username: "admin" };
      const result = provider.signRefreshToken(payload);
      expect(result.refreshToken).toBeDefined();
      expect(result.expiresIn).toBe(2592000);
    });
  });

  describe("verifyToken", () => {
    it("should verify a valid token", () => {
      const token = "valid.jwt.token";
      const result = provider.verifyToken(token);
      expect(result).toBeDefined();
      expect(result?.sub).toBe(1);
    });

    it("should return null for invalid token", () => {
      const jwtService = {
        verify: vi.fn(() => {
          throw new Error("Invalid");
        }),
      };
      const providerWithError = new JwtProvider(jwtService as any);
      const result = providerWithError.verifyToken("invalid.token");
      expect(result).toBeNull();
    });
  });

  describe("verifyRefreshToken", () => {
    it("should verify a valid refresh token", () => {
      const token = "valid.refresh.token";
      const result = provider.verifyRefreshToken(token);
      expect(result).toBeDefined();
    });

    it("should return null if refresh token type is invalid", () => {
      const jwtService = {
        verify: vi.fn(() => ({ sub: 1, type: "access" })),
      };
      const providerWithError = new JwtProvider(jwtService as any);
      const result = providerWithError.verifyRefreshToken("token");
      expect(result).toBeNull();
    });
  });
});
