import { describe, it, expect, beforeEach, vi } from "vitest";
import { UserRepository } from "../repositories/user.repository";

describe("UserRepository DataScope Filtering", () => {
  let repository: UserRepository;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      user: {
        count: vi.fn().mockResolvedValue(0),
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    repository = new UserRepository(prismaMock);
  });

  it("should query only self record when isSelf is true", async () => {
    await repository.findPage(
      { page: 1, pageSize: 10 },
      { userId: 5, isAll: false, isSelf: true, deptIds: [] },
    );
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 5 }),
      }),
    );
  });

  it("should query allowed deptIds when not isAll", async () => {
    await repository.findPage(
      { page: 1, pageSize: 10 },
      { userId: 5, isAll: false, isSelf: false, deptIds: [10, 20] },
    );
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deptId: { in: [10, 20] } }),
      }),
    );
  });

  it("should not query deptId constraint when isAll is true", async () => {
    await repository.findPage(
      { page: 1, pageSize: 10 },
      { userId: 5, isAll: true, isSelf: false, deptIds: [] },
    );
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: null },
      }),
    );
  });
});
