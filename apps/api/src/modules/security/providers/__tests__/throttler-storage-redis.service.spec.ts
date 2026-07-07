import { describe, it, expect, beforeEach, vi } from "vitest";
import { ThrottlerStorageRedisService } from "../throttler-storage-redis.service";

describe("ThrottlerStorageRedisService", () => {
  let service: ThrottlerStorageRedisService;
  let mockRedis: any;

  beforeEach(() => {
    mockRedis = {
      eval: vi.fn(),
    };
    service = new ThrottlerStorageRedisService(mockRedis);
  });

  it("should increment and return not blocked", async () => {
    mockRedis.eval.mockResolvedValue([0, 3, 59500, 0]);

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
    mockRedis.eval.mockResolvedValue([0, 6, 59000, 299500]);

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
    expect(record.timeToBlockExpire).toBe(300);
  });

  it("should return blocked when block key already exists", async () => {
    mockRedis.eval.mockResolvedValue([1, 0, 120000, 120000]);

    const record = await service.increment(
      "auth/login:127.0.0.1",
      60000,
      5,
      300000,
      "default",
    );

    expect(record.totalHits).toBe(0);
    expect(record.isBlocked).toBe(true);
    expect(record.timeToExpire).toBe(120);
    expect(record.timeToBlockExpire).toBe(120);
  });

  it("should use sekiro:throttle: key prefix in eval keys", async () => {
    mockRedis.eval.mockResolvedValue([0, 1, 60000, 0]);

    await service.increment("auth/login:127.0.0.1", 60000, 5, 300000, "default");

    expect(mockRedis.eval).toHaveBeenCalledTimes(1);
    const [, options] = mockRedis.eval.mock.calls[0];
    expect(options.keys[0]).toMatch(/^sekiro:throttle:default:auth\/login:127\.0\.0\.1$/);
    expect(options.keys[1]).toMatch(/^sekiro:throttle:block:default:auth\/login:127\.0\.0\.1$/);
  });
});
