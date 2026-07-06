import { Injectable, Inject } from "@nestjs/common";
import { ThrottlerStorage, ThrottlerStorageRecord } from "@nestjs/throttler";
import { RedisClientType } from "redis";
import { REDIS_CLIENT } from "../../../redis.module";

@Injectable()
export class ThrottlerStorageRedisService implements ThrottlerStorage {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redisClient: RedisClientType,
  ) {}

  async increment(key: string, ttlMs: number): Promise<ThrottlerStorageRecord> {
    const fullKey = `sekiro:throttle:${key}`;
    const multi = this.redisClient.multi();
    multi.incr(fullKey);
    multi.pExpire(fullKey, ttlMs);
    const results = await multi.exec();
    const totalHits = results ? (results[0] as number) : 1;
    return { totalHits, timeToExpire: ttlMs };
  }
}
