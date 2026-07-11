import { describe, it, expect, vi } from "vitest";
import { Test } from "@nestjs/testing";
import { AppModule } from "../../app.module";
import { PrismaService } from "../prisma/prisma.service";
import { REDIS_CLIENT } from "../../redis.module";
import { LogController } from "../monitor/controllers/log.controller";
import { OnlineController } from "../monitor/controllers/online.controller";
import { ServerController } from "../monitor/controllers/server.controller";

describe("DI Smoke Test", () => {
  it("should compile AppModule and resolve all dependencies without crashing", async () => {
    const mockPrisma = {
      $connect: vi.fn(),
      $disconnect: vi.fn(),
      user: {
        findUnique: vi.fn(),
      },
    };
    const mockRedis = {
      connect: vi.fn(),
      get: vi.fn(),
      set: vi.fn(),
    };

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .overrideProvider(REDIS_CLIENT)
      .useValue(mockRedis)
      .compile();

    expect(moduleFixture).toBeDefined();

    // Verify key controllers are resolved successfully
    const logController = moduleFixture.get(LogController);
    expect(logController).toBeDefined();

    const onlineController = moduleFixture.get(OnlineController);
    expect(onlineController).toBeDefined();

    const serverController = moduleFixture.get(ServerController);
    expect(serverController).toBeDefined();
  });
});
