import { describe, it, expect, beforeEach, vi } from "vitest";
import { PositionService } from "../services/position.service";
import { UnprocessableEntityException, NotFoundException } from "@nestjs/common";

describe("PositionService", () => {
  let service: PositionService;
  let repository: any;

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
      findByName: vi.fn(),
      findByCode: vi.fn(),
      countActiveUsers: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      findPage: vi.fn(),
    };
    service = new PositionService(repository);
  });

  it("创建岗位时，已存在相同 name 抛出 422", async () => {
    repository.findByCode.mockResolvedValue(null);
    repository.findByName.mockResolvedValue({ id: 2, name: "项目经理" });

    await expect(
      service.create({
        name: "项目经理",
        code: "pm",
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it("创建岗位时，已存在相同 code 抛出 422", async () => {
    repository.findByCode.mockResolvedValue({ id: 2, code: "pm" });
    repository.findByName.mockResolvedValue(null);

    await expect(
      service.create({
        name: "项目经理2",
        code: "pm",
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it("删除岗位时，有活跃用户分配了该岗位抛出 422", async () => {
    repository.findById.mockResolvedValue({ id: 2, name: "项目经理" });
    repository.countActiveUsers.mockResolvedValue(2);

    await expect(service.delete(2)).rejects.toThrow(UnprocessableEntityException);
  });

  it("正常删除岗位且无用户关联", async () => {
    repository.findById.mockResolvedValue({ id: 2, name: "项目经理" });
    repository.countActiveUsers.mockResolvedValue(0);
    repository.softDelete.mockResolvedValue(undefined);

    await service.delete(2);
    expect(repository.softDelete).toHaveBeenCalledWith(2);
  });
});
