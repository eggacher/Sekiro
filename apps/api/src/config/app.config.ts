import { INestApplication, ValidationPipe } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";
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

  // 对 /docs 路由放宽 CSP，避免 Scalar/Swagger UI 内联脚本/样式被拦截
  const strictHelmet = helmet({
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
  });

  const docsHelmet = helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    xFrameOptions: { action: "deny" },
    xContentTypeOptions: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === "/docs" || req.path.startsWith("/docs/")) {
      docsHelmet(req, res, next);
    } else {
      strictHelmet(req, res, next);
    }
  });

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
