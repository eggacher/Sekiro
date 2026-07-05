import "reflect-metadata";
import * as dotenv from "dotenv";
import * as path from "path";

// 加载环境变量，优先当前目录，次选 apps/api/.env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { NestFactory } from "@nestjs/core";
import { Module, ValidationPipe } from "@nestjs/common";
import { PrismaModule } from "./modules/prisma";
import { RedisModule } from "./redis.module";
import { AuthModule } from "./modules/auth";
import { UserModule } from "./modules/user";
import { RoleModule } from "./modules/role";
import { MenuModule } from "./modules/menu";
import { DeptModule } from "./modules/dept";
import { DictModule } from "./modules/dict";
import { MonitorModule } from "./modules/monitor";

@Module({
  imports: [PrismaModule, RedisModule, AuthModule, UserModule, RoleModule, MenuModule, DeptModule, DictModule, MonitorModule],
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局 API 前缀，与前端 /api 代理对齐
  app.setGlobalPrefix("api");

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
