import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerModuleOptions } from "@nestjs/throttler";
import { RedisClientType } from "redis";
import { encryptedConfigLoader } from "./providers/encrypted-config.loader";
import { ThrottlerStorageRedisService } from "./providers/throttler-storage-redis.service";
import { RedisModule, REDIS_CLIENT } from "../../redis.module";
import { UploadController } from "./controllers/upload.controller";

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
            ttl: parseInt(process.env.THROTTLE_TTL || "60", 10) * 1000,
            limit: parseInt(process.env.THROTTLE_LIMIT || "10", 10),
          },
        ],
        storage: new ThrottlerStorageRedisService(redisClient),
      }),
    }),
  ],
  controllers: [UploadController],
  providers: [ThrottlerStorageRedisService],
  exports: [ThrottlerStorageRedisService],
})
export class SecurityModule {}
