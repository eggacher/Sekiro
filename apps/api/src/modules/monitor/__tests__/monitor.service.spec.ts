import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { LogService } from "../services/log.service";
import { OnlineService } from "../services/online.service";
import { ServerService } from "../services/server.service";

describe("MonitorServices", () => {
  let logService: LogService;
  let onlineService: OnlineService;
  let serverService: ServerService;

  const mockLoginLogRepo = { create: vi.fn(), findPage: vi.fn() };
  const mockOpLogRepo = { create: vi.fn(), findPage: vi.fn() };
  const mockRedisSession = {
    getSessionKeys: vi.fn().mockResolvedValue([]),
    getSession: vi.fn(),
    deleteSession: vi.fn(),
  };
  const mockPrisma = {
    user: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  };

  beforeEach(() => {
    logService = new LogService(mockLoginLogRepo as any, mockOpLogRepo as any);
    onlineService = new OnlineService(mockRedisSession as any, mockPrisma as any);
    serverService = new ServerService();
    serverService.onModuleInit();
  });

  afterEach(() => {
    serverService.onModuleDestroy();
  });

  it("should call log service create", async () => {
    await logService.createLoginLog({ username: "a", ip: "b", result: "success", message: "c" });
    expect(mockLoginLogRepo.create).toHaveBeenCalled();
  });

  it("should get empty online users", async () => {
    const res = await onlineService.getOnlineUsers({});
    expect(res.length).toBe(0);
  });

  it("should get server system info", async () => {
    const res = await serverService.getServerInfo();
    expect(res.hostname).toBeDefined();
    expect(res.cpuUsage).toBeDefined();
    expect(res.cpuTrend.length).toBe(30);
  });
});
