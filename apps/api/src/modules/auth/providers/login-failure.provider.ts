import { Injectable, Inject } from '@nestjs/common';
import { RedisClientType } from 'redis';
import { REDIS_CLIENT } from '../../../redis.module';

const FAILURE_TTL = 30 * 60; // 30 minutes
const MAX_FAILURES = 5;

@Injectable()
export class LoginFailureProvider {
  constructor(@Inject(REDIS_CLIENT) private redisClient: RedisClientType) {}

  async incrementFailure(userId: number): Promise<number> {
    const key = `sekiro:login:failure:${userId}`;
    const count = await this.redisClient.incr(key);

    // Set TTL on first increment
    if (count === 1) {
      await this.redisClient.expire(key, FAILURE_TTL);
    }

    return count;
  }

  async getFailureCount(userId: number): Promise<number> {
    const key = `sekiro:login:failure:${userId}`;
    const count = await this.redisClient.get(key);
    return count ? parseInt(count, 10) : 0;
  }

  async lockUser(userId: number, durationSeconds: number = FAILURE_TTL): Promise<void> {
    const key = `sekiro:login:locked:${userId}`;
    await this.redisClient.set(key, 'true', { EX: durationSeconds });
  }

  async isLocked(userId: number): Promise<boolean> {
    const key = `sekiro:login:locked:${userId}`;
    const value = await this.redisClient.get(key);
    return value === 'true';
  }

  async clearFailure(userId: number): Promise<void> {
    const failureKey = `sekiro:login:failure:${userId}`;
    const lockedKey = `sekiro:login:locked:${userId}`;
    await this.redisClient.del([failureKey, lockedKey]);
  }

  getMaxFailures(): number {
    return MAX_FAILURES;
  }

  getFailureTtl(): number {
    return FAILURE_TTL;
  }
}
