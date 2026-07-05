import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Module, ValidationPipe } from "@nestjs/common";
import { PrismaModule } from "./modules/prisma";
import { RedisModule } from "./redis.module";
import { AuthModule } from "./modules/auth";

@Module({
  imports: [PrismaModule, RedisModule, AuthModule],
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局 DTO 验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(3001);
  console.log("API on http://localhost:3001");
}

bootstrap();
