import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import helmet from "helmet";
import { AppModule } from "../../../app.module";
import { REDIS_CLIENT } from "../../../redis.module";

describe("Security Headers (integration)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(REDIS_CLIENT)
      .useValue({
        connect: vi.fn().mockResolvedValue(undefined),
        multi: vi.fn(() => ({
          incr: vi.fn().mockReturnThis(),
          pExpire: vi.fn().mockReturnThis(),
          exec: vi.fn().mockResolvedValue([1]),
        })),
        get: vi.fn().mockResolvedValue(null),
        setEx: vi.fn().mockResolvedValue("OK"),
        del: vi.fn().mockResolvedValue(1),
        expire: vi.fn().mockResolvedValue(1),
        incr: vi.fn().mockResolvedValue(1),
      })
      .compile();

    app = moduleRef.createNestApplication();
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
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("should include helmet security headers", async () => {
    const response = await request(app.getHttpServer()).get("/api/health");
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["strict-transport-security"]).toBeDefined();
    expect(response.headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });
});
