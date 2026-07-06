import { describe, it, expect, beforeEach, vi } from "vitest";
import { ThrottlerStorageRedisService } from "../throttler-storage-redis.service";

describe("ThrottlerStorageRedisService", () => {
  let service: ThrottlerStorageRedisService;
  let mockRedis: any;

  beforeEach(() => {
    mockRedis = {
      multi: vi.fn(() => {
        const queue: Array<() => unknown> = [];
        return {
          incr: vi.fn((key: string) => {
            queue.push(() => ({ key, op: "incr" }));
            return mockRedis.multi();
          }),
          pExpire: vi.fn((key: string, ttl: number, mode?: string) => {
            queue.push(() => ({ key, ttl, mode, op: "pExpire" }));
            return mockRedis.multi();
          }),
          pTTL: vi.fn((key: string) => {
            queue.push(() => ({ key, op: "pTTL" }));
            return mockRedis.multi();
          }),
          set: vi.fn((key: string, value: string, options?: Record<string, unknown>) => {
            queue.push(() => ({ key, value, options, op: "set" }));
            return mockRedis.multi();
          }),
          exec: vi.fn().mockResolvedValue([]),
          _queue: queue,
        };
      }),
    };
    service = new ThrottlerStorageRedisService(mockRedis);
  });

  it("should increment and set TTL", async () => {
    mockRedis.multi = vi.fn(() => ({
      incr: vi.fn().mockReturnThis(),
      pExpire: vi.fn().mockReturnThis(),
      pTTL: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([3, true, 59500]),
    }));

    const record = await service.increment(
      "auth/login:127.0.0.1",
      60000,
      5,
      300000,
      "default",
    );

    expect(record.totalHits).toBe(3);
    expect(record.timeToExpire).toBe(60);
    expect(record.isBlocked).toBe(false);
    expect(record.timeToBlockExpire).toBe(0);
  });

  it("should block when totalHits exceeds limit", async () => {
    mockRedis.multi = vi.fn(() => ({
      incr: vi.fn().mockReturnThis(),
      pExpire: vi.fn().mockReturnThis(),
      pTTL: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([6, true, 59000]),
    }));

    const record = await service.increment(
      "auth/login:127.0.0.1",
      60000,
      5,
      300000,
      "default",
    );

    expect(record.totalHits).toBe(6);
    expect(record.isBlocked).toBe(true);
    expect(record.timeToExpire).toBe(59);
  });

  it("should use sekiro:throttle: key prefix", async () => {
    let capturedKey = "";
    mockRedis.multi = vi.fn(() => ({
      incr: vi.fn((key: string) => {
        capturedKey = key;
        return mockRedis.multi();
      }),
      pExpire: vi.fn().mockReturnThis(),
      pTTL: vi.fn().mockReturnThis(),
      set: vi.fn().mockReturnThis(),
      exec: vi.fn().mockResolvedValue([1, true, 60000]),
    }));

    await service.increment("auth/login:127.0.0.1", 60000, 5, 300000, "default");

    expect(capturedKey.startsWith("sekiro:throttle:")).toBe(true);
  });
});
