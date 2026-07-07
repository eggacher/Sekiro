import { Injectable, Inject } from "@nestjs/common";
import { ThrottlerStorage } from "@nestjs/throttler";
import type { RedisClientType } from "redis";
import { REDIS_CLIENT } from "../../../redis.module";

const KEY_PREFIX = "sekiro:throttle:";
const BLOCK_KEY_PREFIX = `${KEY_PREFIX}block:`;

/**
 * Shape of the object returned by @nestjs/throttler storage implementations.
 * Inline definition avoids a deep import into package internals.
 */
export interface ThrottlerStorageRecord {
  totalHits: number;
  timeToExpire: number;
  isBlocked: boolean;
  timeToBlockExpire: number;
}

const INCREMENT_SCRIPT = `
local key = KEYS[1]
local blockKey = KEYS[2]
local ttl = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local blockDuration = tonumber(ARGV[3])

local blockTtl = redis.call('PTTL', blockKey)
if blockTtl > 0 then
  local totalHits = tonumber(redis.call('GET', key)) or 0
  return {1, totalHits, blockTtl, blockTtl}
end

local totalHits = redis.call('INCR', key)
if totalHits == 1 then
  redis.call('PEXPIRE', key, ttl)
end
local timeToExpire = redis.call('PTTL', key)

local timeToBlockExpire = 0
if totalHits > limit then
  redis.call('SET', blockKey, '1', 'PX', blockDuration)
  timeToBlockExpire = redis.call('PTTL', blockKey)
end

return {0, totalHits, timeToExpire, timeToBlockExpire}
`;

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

    const result = (await this.redisClient.eval(INCREMENT_SCRIPT, {
      keys: [fullKey, blockKey],
      arguments: [
        Math.round(ttl).toString(),
        Math.round(limit).toString(),
        Math.round(blockDuration).toString(),
      ],
    })) as [number, number, number, number];

    const blockedByExisting = result[0] === 1;
    const totalHits = result[1];
    const timeToExpire = Math.max(0, Math.ceil(result[2] / 1000));
    const timeToBlockExpire = Math.max(0, Math.ceil(result[3] / 1000));

    return {
      totalHits,
      timeToExpire,
      isBlocked: blockedByExisting || totalHits > limit,
      timeToBlockExpire,
    };
  }
}
