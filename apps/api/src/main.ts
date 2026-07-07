import "reflect-metadata";
import * as dotenv from "dotenv";
import * as path from "path";

// 加载环境变量，优先当前目录，次选 apps/api/.env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";
import { AppModule } from "./app.module";
import { configureApp } from "./config/app.config";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  configureApp(app);

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
