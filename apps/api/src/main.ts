import "reflect-metadata";
import * as dotenv from "dotenv";
import * as path from "path";

// 加载环境变量，优先当前目录，次选 apps/api/.env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { NestFactory } from "@nestjs/core";
import { Module, ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";
import { PrismaModule } from "./modules/prisma";
import { RedisModule } from "./redis.module";
import { AuthModule } from "./modules/auth";
import { UserModule } from "./modules/user";
import { RoleModule } from "./modules/role";
import { MenuModule } from "./modules/menu";
import { DeptModule } from "./modules/dept";
import { DictModule } from "./modules/dict";
import { MonitorModule } from "./modules/monitor";
import { HealthController } from "./health.controller";

@Module({
  imports: [PrismaModule, RedisModule, AuthModule, UserModule, RoleModule, MenuModule, DeptModule, DictModule, MonitorModule],
  controllers: [HealthController],
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局 API 前缀，与前端 /api 代理对齐
  app.setGlobalPrefix("api", { exclude: ["/health"] });

  // 全局 DTO 验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // OpenAPI 文档（所有环境均可用）
  const config = new DocumentBuilder()
    .setTitle("Sekiro API")
    .setDescription("Sekiro 中后台脚手架 API 文档")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);

  app.use(
    "/docs",
    apiReference({
      content: document,
      theme: "default",
      darkMode: true,
      metaData: {
        title: "Sekiro API Docs",
      },
    }),
  );

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port);
  console.log(`API on http://localhost:${port}`);
}

bootstrap();
