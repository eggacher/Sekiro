import { Injectable, Inject } from "@nestjs/common";
import { ThrottlerStorage } from "@nestjs/throttler";
import type { ThrottlerStorageRecord } from "@nestjs/throttler/dist/throttler-storage-record.interface";
import type { RedisClientType } from "redis";
import { REDIS_CLIENT } from "../../../redis.module";

const KEY_PREFIX = "sekiro:throttle:";
const BLOCK_KEY_PREFIX = `${KEY_PREFIX}block:`;

@Injectable()
export class ThrottlerStorageRedisService implements ThrottlerStorage {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redisClient: RedisClientType,
  ) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const fullKey = `${KEY_PREFIX}${throttlerName}:${key}`;
    const blockKey = `${BLOCK_KEY_PREFIX}${throttlerName}:${key}`;

    const multi = this.redisClient.multi();
    multi.incr(fullKey);
    multi.pExpire(fullKey, ttl, "NX");
    multi.pTTL(fullKey);
    const results = await multi.exec();

    const totalHits = results ? (results[0] as number) : 1;
    const timeToExpire = results
      ? Math.ceil((results[2] as number) / 1000)
      : Math.ceil(ttl / 1000);

    if (totalHits > limit) {
      const blockMulti = this.redisClient.multi();
      blockMulti.set(blockKey, "1", { PX: blockDuration });
      blockMulti.pTTL(blockKey);
      const blockResults = await blockMulti.exec();

      const timeToBlockExpire = blockResults
        ? Math.ceil((blockResults[1] as number) / 1000)
        : Math.ceil(blockDuration / 1000);

      return { totalHits, timeToExpire, isBlocked: true, timeToBlockExpire };
    }

    return {
      totalHits,
      timeToExpire,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }
}
