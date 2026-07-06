import { INestApplication, ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { ThrottlerGuard } from "@nestjs/throttler";
import { ThrottlerExceptionFilter } from "../modules/security/filters/throttler-exception.filter";
import { FileValidationExceptionFilter } from "../modules/security/filters/file-validation-exception.filter";

/**
 * Applies production application-level middleware, guards, pipes and filters.
 * Extracted so integration tests can reuse the real bootstrap configuration.
 */
export function configureApp(app: INestApplication): void {
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
  app.useGlobalFilters(new FileValidationExceptionFilter());

  // 全局 DTO 验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
