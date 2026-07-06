import { describe, it, expect, beforeEach, vi } from "vitest";
import { ThrottlerStorageRedisService } from "../throttler-storage-redis.service";

describe("ThrottlerStorageRedisService", () => {
  let service: ThrottlerStorageRedisService;
  let mockRedis: any;

  beforeEach(() => {
    mockRedis = {
      multi: vi.fn(() => ({
        incr: vi.fn().mockReturnThis(),
        pExpire: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([3]),
      })),
    };
    service = new ThrottlerStorageRedisService(mockRedis);
  });

  it("should increment and set TTL", async () => {
    const record = await service.increment("auth/login:127.0.0.1", 60000);
    expect(record.totalHits).toBe(3);
    expect(record.timeToExpire).toBe(60000);
    expect(mockRedis.multi).toHaveBeenCalled();
  });
});
