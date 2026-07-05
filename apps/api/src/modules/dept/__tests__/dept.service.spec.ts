import { describe, it, expect, beforeEach, vi } from "vitest";
import { DeptService } from "../services/dept.service";
import { UnprocessableEntityException, NotFoundException } from "@nestjs/common";

describe("DeptService", () => {
  let service: DeptService;
  let repository: any;

  beforeEach(() => {
    repository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      countActiveChildren: vi.fn(),
      countActiveUsers: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
    };
    service = new DeptService(repository);
  });

  it("创建部门时，parentId 不存在抛出 404", async () => {
    repository.findById.mockResolvedValue(null);
    await expect(
      service.create({
        parentId: 999,
        name: "深圳分公司",
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it("更新部门导致环路 (INV-4) 抛出异常", async () => {
    // 假设部门关系： 101 (根) -> 102 (深圳分公司) -> 103 (开发部)
    // 试图将 102 的 parentId 设为 103
    repository.findById.mockImplementation(async (id: number) => {
      if (id === 102) {
        return { id: 102, parentId: 101, name: "深圳分公司" };
      }
      if (id === 103) {
        return { id: 103, parentId: 102, name: "开发部" };
      }
      return null;
    });

    await expect(
      service.update(102, {
        parentId: 103,
        name: "深圳分公司",
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it("删除部门时，有未删除子部门抛出 422", async () => {
    repository.findById.mockResolvedValue({ id: 102, name: "深圳分公司" });
    repository.countActiveChildren.mockResolvedValue(1);
    repository.countActiveUsers.mockResolvedValue(0);

    await expect(service.delete(102)).rejects.toThrow(UnprocessableEntityException);
  });

  it("删除部门时，有关联活跃用户抛出 422", async () => {
    repository.findById.mockResolvedValue({ id: 102, name: "深圳分公司" });
    repository.countActiveChildren.mockResolvedValue(0);
    repository.countActiveUsers.mockResolvedValue(3);

    await expect(service.delete(102)).rejects.toThrow(UnprocessableEntityException);
  });

  it("正常删除部门且无子部门/用户关联", async () => {
    repository.findById.mockResolvedValue({ id: 102, name: "深圳分公司" });
    repository.countActiveChildren.mockResolvedValue(0);
    repository.countActiveUsers.mockResolvedValue(0);
    repository.softDelete.mockResolvedValue(undefined);

    await service.delete(102);
    expect(repository.softDelete).toHaveBeenCalledWith(102);
  });
});
