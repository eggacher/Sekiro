import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule, ThrottlerModuleOptions } from "@nestjs/throttler";
import { RedisClientType } from "redis";
import { encryptedConfigLoader } from "./providers/encrypted-config.loader";
import { ThrottlerStorageRedisService } from "./providers/throttler-storage-redis.service";
import { RedisModule, REDIS_CLIENT } from "../../redis.module";

function parseThrottleNumber(
  value: string | undefined,
  fallback: string,
  name: string,
): number {
  const parsed = parseInt(value || fallback, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer, got "${value}"`);
  }
  return parsed;
}

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [".env", "../.env"],
      isGlobal: true,
      load: [encryptedConfigLoader],
    }),
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [REDIS_CLIENT],
      useFactory: (
        redisClient: RedisClientType,
      ): ThrottlerModuleOptions => ({
        throttlers: [
          {
            ttl:
              parseThrottleNumber(
                process.env.THROTTLE_TTL,
                "60",
                "THROTTLE_TTL",
              ) * 1000,
            limit: parseThrottleNumber(
              process.env.THROTTLE_LIMIT,
              "10",
              "THROTTLE_LIMIT",
            ),
          },
        ],
        storage: new ThrottlerStorageRedisService(redisClient),
      }),
    }),
  ],
  providers: [ThrottlerGuard, ThrottlerStorageRedisService],
  exports: [ThrottlerGuard, ThrottlerStorageRedisService],
})
export class SecurityModule {}
