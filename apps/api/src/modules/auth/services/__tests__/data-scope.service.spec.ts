import { describe, it, expect, beforeEach, vi } from "vitest";
import { DataScopeService } from "../data-scope.service";

describe("DataScopeService", () => {
  let service: DataScopeService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      user: {
        findFirst: vi.fn(),
      },
      userRole: {
        findMany: vi.fn(),
      },
      dept: {
        findMany: vi.fn(),
      },
    };
    service = new DataScopeService(prismaMock);
  });

  it("should grant all for user 1", async () => {
    const res = await service.calculateScope(1);
    expect(res.isAll).toBe(true);
    expect(res.userId).toBe(1);
  });

  it("should calculate scope correctly for dept only", async () => {
    prismaMock.user.findFirst.mockResolvedValue({ deptId: 10 });
    prismaMock.userRole.findMany.mockResolvedValue([
      {
        role: {
          dataScope: "dept",
          status: "enabled",
          depts: [],
        },
      },
    ]);
    const res = await service.calculateScope(2);
    expect(res.isAll).toBe(false);
    expect(res.isSelf).toBe(false);
    expect(res.deptIds).toContain(10);
  });

  it("should calculate scope correctly for self only", async () => {
    prismaMock.user.findFirst.mockResolvedValue({ deptId: 10 });
    prismaMock.userRole.findMany.mockResolvedValue([
      {
        role: {
          dataScope: "self",
          status: "enabled",
          depts: [],
        },
      },
    ]);
    const res = await service.calculateScope(2);
    expect(res.isAll).toBe(false);
    expect(res.isSelf).toBe(true);
    expect(res.deptIds.length).toBe(0);
  });
});
