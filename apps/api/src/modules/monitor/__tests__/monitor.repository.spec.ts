import { describe, it, expect, beforeEach, vi } from "vitest";
import { LoginLogRepository } from "../repositories/login-log.repository";
import { OpLogRepository } from "../repositories/op-log.repository";

describe("MonitorRepositories", () => {
  let loginLogRepo: LoginLogRepository;
  let opLogRepo: OpLogRepository;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      loginLog: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data })),
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([{ id: 1, username: "admin", result: "success" }]),
      },
      operationLog: {
        create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data })),
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([{ id: 1, operator: "admin", status: "success" }]),
      },
    };

    loginLogRepo = new LoginLogRepository(prismaMock);
    opLogRepo = new OpLogRepository(prismaMock);
  });

  it("should create login log", async () => {
    const res = await loginLogRepo.create({
      username: "admin",
      ip: "127.0.0.1",
      result: "success",
      message: "success",
    });
    expect(res.id).toBe(1);
    expect(prismaMock.loginLog.create).toHaveBeenCalled();
  });

  it("should query login log pages", async () => {
    const res = await loginLogRepo.findPage({ page: 1, pageSize: 10 });
    expect(res.list.length).toBe(1);
    expect(res.total).toBe(1);
  });

  it("should create operation log", async () => {
    const res = await opLogRepo.create({
      operator: "admin",
      module: "测试",
      type: "create",
      description: "测试",
      method: "POST",
      url: "/test",
      ip: "127.0.0.1",
      cost: 10,
      status: "success",
    });
    expect(res.id).toBe(1);
    expect(prismaMock.operationLog.create).toHaveBeenCalled();
  });
});
