import { describe, it, expect, beforeEach, vi } from "vitest";
import { DeptRepository } from "../repositories/dept.repository";

describe("DeptRepository DataScope Filtering", () => {
  let repository: DeptRepository;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      dept: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      user: {
        findFirst: vi.fn().mockResolvedValue({ deptId: 20 }),
      },
    };
    repository = new DeptRepository(prismaMock);
  });

  it("should query only self department when isSelf is true", async () => {
    await repository.findAll(
      {},
      { userId: 5, isAll: false, isSelf: true, deptIds: [] },
    );
    expect(prismaMock.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 5 } }),
    );
    expect(prismaMock.dept.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 20 }),
      }),
    );
  });

  it("should filter by allowed deptIds when not isAll and not isSelf", async () => {
    await repository.findAll(
      {},
      { userId: 5, isAll: false, isSelf: false, deptIds: [10, 30] },
    );
    expect(prismaMock.dept.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: { in: [10, 30] } }),
      }),
    );
  });
});
