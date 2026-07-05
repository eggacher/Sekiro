import { describe, it, expect, beforeEach, vi } from "vitest";
import { LoginFailureProvider } from "../login-failure.provider";

describe("LoginFailureProvider", () => {
  let provider: LoginFailureProvider;
  let mockRedis: any;

  beforeEach(() => {
    mockRedis = {
      incr: vi.fn(),
      expire: vi.fn().mockResolvedValue(1),
      ttl: vi.fn().mockResolvedValue(1800),
      get: vi.fn(),
      set: vi.fn().mockResolvedValue("OK"),
      del: vi.fn().mockResolvedValue(1),
    };
    provider = new LoginFailureProvider(mockRedis);
  });

  describe("incrementFailure", () => {
    it("should increment failure count and return new count", async () => {
      mockRedis.incr.mockResolvedValueOnce(1);
      mockRedis.incr.mockResolvedValueOnce(2);

      let count = await provider.incrementFailure(1);
      expect(count).toBe(1);

      count = await provider.incrementFailure(1);
      expect(count).toBe(2);
    });

    it("should set TTL on first failure", async () => {
      mockRedis.incr.mockResolvedValueOnce(1);
      await provider.incrementFailure(1);
      expect(mockRedis.expire).toHaveBeenCalledWith(
        "sekiro:login:failure:1",
        1800,
      );
    });

    it("should not set TTL on subsequent failures", async () => {
      mockRedis.incr.mockResolvedValueOnce(2);
      await provider.incrementFailure(1);
      expect(mockRedis.expire).not.toHaveBeenCalled();
    });
  });

  describe("lockUser", () => {
    it("should lock user for specified duration", async () => {
      await provider.lockUser(1, 1800);
      expect(mockRedis.set).toHaveBeenCalledWith(
        "sekiro:login:locked:1",
        "true",
        { EX: 1800 },
      );
    });

    it("should lock user for 30 minutes by default", async () => {
      await provider.lockUser(1);
      expect(mockRedis.set).toHaveBeenCalledWith(
        "sekiro:login:locked:1",
        "true",
        { EX: 1800 },
      );
    });
  });

  describe("isLocked", () => {
    it("should return true if user is locked", async () => {
      mockRedis.get.mockResolvedValueOnce("true");
      const isLocked = await provider.isLocked(1);
      expect(isLocked).toBe(true);
    });

    it("should return false if user is not locked", async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      const isLocked = await provider.isLocked(1);
      expect(isLocked).toBe(false);
    });
  });

  describe("clearFailure", () => {
    it("should delete both failure count and lock keys", async () => {
      await provider.clearFailure(1);
      expect(mockRedis.del).toHaveBeenCalledWith([
        "sekiro:login:failure:1",
        "sekiro:login:locked:1",
      ]);
    });
  });

  describe("getMaxFailures", () => {
    it("should return 5", () => {
      expect(provider.getMaxFailures()).toBe(5);
    });
  });

  describe("getFailureTtl", () => {
    it("should return 1800 seconds (30 minutes)", () => {
      expect(provider.getFailureTtl()).toBe(1800);
    });
  });
});
