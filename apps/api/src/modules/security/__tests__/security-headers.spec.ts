import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../../app.module";
import { REDIS_CLIENT } from "../../../redis.module";
import { configureApp } from "../../../config/app.config";

describe("Security Headers (integration)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(REDIS_CLIENT)
      .useValue({
        connect: vi.fn().mockResolvedValue(undefined),
        eval: vi.fn().mockResolvedValue([0, 0, 0, 0]),
        get: vi.fn().mockResolvedValue(null),
        setEx: vi.fn().mockResolvedValue("OK"),
        del: vi.fn().mockResolvedValue(1),
        expire: vi.fn().mockResolvedValue(1),
        incr: vi.fn().mockResolvedValue(1),
      })
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
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
    expect(response.headers["content-security-policy"]).toBeDefined();
  });
});
