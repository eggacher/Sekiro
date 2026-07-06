import "reflect-metadata";
import * as dotenv from "dotenv";
import * as path from "path";

// 加载环境变量，优先当前目录，次选 apps/api/.env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";
import helmet from "helmet";
import { ThrottlerGuard } from "@nestjs/throttler";
import { AppModule } from "./app.module";
import { ThrottlerExceptionFilter } from "./modules/security/filters/throttler-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局 API 前缀，与前端 /api 代理对齐
  app.setGlobalPrefix("api");

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "blob:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      xFrameOptions: { action: "deny" },
      xContentTypeOptions: true,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    }),
  );

  app.useGlobalGuards(app.get(ThrottlerGuard));
  app.useGlobalFilters(new ThrottlerExceptionFilter());

  // 全局 DTO 验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // OpenAPI 文档（仅非生产环境）
  if (process.env.NODE_ENV !== "production") {
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
  }

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port);
  console.log(`API on http://localhost:${port}`);
}

bootstrap();
