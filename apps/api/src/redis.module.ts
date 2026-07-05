import { Global, Module } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { redisConfig } from './config/redis.config';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: async (): Promise<RedisClientType> => {
        const client = createClient({
          host: redisConfig.host,
          port: redisConfig.port,
          db: redisConfig.db,
          password: redisConfig.password,
        });
        await client.connect();
        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
