import { describe, it, beforeEach, expect, vi } from "vitest";
import { RedisSessionProvider } from "../redis-session.provider";
import { Session } from "../../types";

describe("RedisSessionProvider", () => {
  let provider: RedisSessionProvider;
  let mockRedis: any;

  beforeEach(() => {
    mockRedis = {
      setEx: vi.fn().mockResolvedValue("OK"),
      get: vi.fn(),
      del: vi.fn().mockResolvedValue(1),
      ttl: vi.fn().mockResolvedValue(1800),
    };
    provider = new RedisSessionProvider(mockRedis);
  });

  describe("createSession", () => {
    it("should create a session with TTL", async () => {
      const session: Session = {
        userId: 1,
        username: "admin",
        token: "jwt.token",
        refreshToken: "refresh.token",
        remember: true,
        ip: "127.0.0.1",
        userAgent: "Mozilla/5.0",
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        expiresAt: new Date().toISOString(),
      };
      await provider.createSession("session-123", session, 2592000);
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        "sekiro:session:session-123",
        2592000,
        expect.stringContaining("admin"),
      );
    });
  });

  describe("getSession", () => {
    it("should get a session", async () => {
      mockRedis.get.mockResolvedValue(
        JSON.stringify({ userId: 1, username: "admin" }),
      );
      const result = await provider.getSession("session-123");
      expect(result?.userId).toBe(1);
      expect(result?.username).toBe("admin");
    });

    it("should return null for non-existent session", async () => {
      mockRedis.get.mockResolvedValue(null);
      const result = await provider.getSession("non-existent");
      expect(result).toBeNull();
    });
  });

  describe("deleteSession", () => {
    it("should delete a session", async () => {
      await provider.deleteSession("session-123");
      expect(mockRedis.del).toHaveBeenCalledWith("sekiro:session:session-123");
    });
  });

  describe("updateSessionToken", () => {
    it("should update session token", async () => {
      mockRedis.get.mockResolvedValueOnce(
        JSON.stringify({
          userId: 1,
          username: "admin",
          token: "old.token",
        }),
      );
      mockRedis.ttl.mockResolvedValueOnce(1800);

      await provider.updateSessionToken("session-123", "new.token");

      expect(mockRedis.setEx).toHaveBeenCalledWith(
        "sekiro:session:session-123",
        1800,
        expect.stringContaining("new.token"),
      );
    });
  });
});
