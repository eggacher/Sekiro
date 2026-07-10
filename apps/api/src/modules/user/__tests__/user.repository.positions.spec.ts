import { describe, it, expect, beforeEach, vi } from "vitest";
import { UserRepository } from "../repositories/user.repository";

const userInclude = {
  dept: true,
  roles: { include: { role: true } },
  positions: { include: { position: true } },
};

const baseUser = {
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  status: "enabled",
};

describe("UserRepository Positions", () => {
  let repository: UserRepository;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      user: {
        findFirst: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
      },
    };
    repository = new UserRepository(prismaMock);
  });

  it("findById 返回 positionIds/positionNames 与 dept/role 字段，且不包含敏感字段", async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      ...baseUser,
      id: 1,
      username: "admin",
      passwordHash: "should-not-leak",
      loginFailCount: 3,
      lockedUntil: new Date(),
      dept: { id: 5, name: "研发部" },
      roles: [
        { roleId: 2, role: { id: 2, name: "运维" } },
        { roleId: 1, role: { id: 1, name: "管理员" } },
      ],
      positions: [
        { positionId: 10, position: { id: 10, name: "董事长" } },
        { positionId: 11, position: { id: 11, name: "总经理" } },
      ],
    });
    const result = await repository.findById(1);
    expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
      where: { id: 1, deletedAt: null },
      include: userInclude,
    });
    expect(result?.positionIds).toEqual([10, 11]);
    expect(result?.positionNames).toEqual(["董事长", "总经理"]);
    expect(result?.deptName).toBe("研发部");
    expect(result?.roleIds).toEqual([1, 2]);
    expect(result?.roleNames).toEqual(["管理员", "运维"]);
    expect(result).not.toHaveProperty("passwordHash");
    expect(result).not.toHaveProperty("loginFailCount");
    expect(result).not.toHaveProperty("lockedUntil");
  });

  it("findSensitiveById 仅返回 id 与 passwordHash 且不包含岗位关联", async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: 1,
      passwordHash: "secret-hash",
    });
    const result = await repository.findSensitiveById(1);
    expect(prismaMock.user.findFirst).toHaveBeenCalledWith({
      where: { id: 1, deletedAt: null },
      select: { id: true, passwordHash: true },
    });
    expect(result).toEqual({ id: 1, passwordHash: "secret-hash" });
  });

  it("findById 无部门/角色/岗位时返回 null 部门与空数组", async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      ...baseUser,
      id: 1,
      username: "admin",
      dept: null,
      roles: [],
      positions: [],
    });
    const result = await repository.findById(1);
    expect(result?.positionIds).toEqual([]);
    expect(result?.positionNames).toEqual([]);
    expect(result?.roleIds).toEqual([]);
    expect(result?.roleNames).toEqual([]);
    expect(result?.deptName).toBeNull();
  });

  it("findPage 映射 position/dept/role 字段，且不包含敏感字段", async () => {
    prismaMock.user.count.mockResolvedValue(1);
    prismaMock.user.findMany.mockResolvedValue([
      {
        ...baseUser,
        id: 1,
        username: "admin",
        passwordHash: "should-not-leak",
        loginFailCount: 0,
        dept: { id: 5, name: "研发部" },
        roles: [{ roleId: 1, role: { id: 1, name: "管理员" } }],
        positions: [{ positionId: 10, position: { id: 10, name: "董事长" } }],
      },
    ]);
    const result = await repository.findPage(
      { page: 1, pageSize: 10 },
      { isAll: true, isSelf: false, userId: 1, deptIds: [] }
    );
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: userInclude,
      })
    );
    expect(result.list[0].positionIds).toEqual([10]);
    expect(result.list[0].positionNames).toEqual(["董事长"]);
    expect(result.list[0].deptName).toBe("研发部");
    expect(result.list[0].roleIds).toEqual([1]);
    expect(result.list[0].roleNames).toEqual(["管理员"]);
    expect(result.list[0]).not.toHaveProperty("passwordHash");
    expect(result.list[0]).not.toHaveProperty("loginFailCount");
  });

  it("findById 岗位按 sort 与 positionId 稳定排序", async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      ...baseUser,
      id: 1,
      username: "admin",
      dept: null,
      roles: [],
      positions: [
        { positionId: 30, position: { id: 30, name: "工程师", sort: 5 } },
        { positionId: 20, position: { id: 20, name: "总经理", sort: 1 } },
        { positionId: 10, position: { id: 10, name: "董事长", sort: 1 } },
      ],
    });
    const result = await repository.findById(1);
    expect(result?.positionIds).toEqual([10, 20, 30]);
    expect(result?.positionNames).toEqual(["董事长", "总经理", "工程师"]);
  });

  it("findPage 岗位按 sort 与 positionId 稳定排序", async () => {
    prismaMock.user.count.mockResolvedValue(1);
    prismaMock.user.findMany.mockResolvedValue([
      {
        ...baseUser,
        id: 1,
        username: "admin",
        dept: null,
        roles: [],
        positions: [
          { positionId: 30, position: { id: 30, name: "工程师", sort: 5 } },
          { positionId: 20, position: { id: 20, name: "总经理", sort: 1 } },
          { positionId: 10, position: { id: 10, name: "董事长", sort: 1 } },
        ],
      },
    ]);
    const result = await repository.findPage(
      { page: 1, pageSize: 10 },
      { isAll: true, isSelf: false, userId: 1, deptIds: [] }
    );
    expect(result.list[0].positionIds).toEqual([10, 20, 30]);
    expect(result.list[0].positionNames).toEqual(["董事长", "总经理", "工程师"]);
  });
});
