import { describe, it, expect, beforeEach, vi } from "vitest";
import { RoleService } from "../services/role.service";
import { ForbiddenException, UnprocessableEntityException, NotFoundException } from "@nestjs/common";

describe("RoleService", () => {
  let service: RoleService;
  let repository: any;

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
      findByCode: vi.fn(),
      findByName: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      updateStatus: vi.fn(),
      assignMenus: vi.fn(),
      setDataScope: vi.fn(),
      findPage: vi.fn(),
    };
    service = new RoleService(repository);
  });

  it("新建角色 - code 已存在抛出异常", async () => {
    repository.findByCode.mockResolvedValue({ id: 2, code: "editor" });
    repository.findByName.mockResolvedValue(null);
    await expect(
      service.create({ name: "编辑者", code: "editor" }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it("新建角色 - name 已存在抛出异常", async () => {
    repository.findByCode.mockResolvedValue(null);
    repository.findByName.mockResolvedValue({ id: 2, name: "编辑者" });
    await expect(
      service.create({ name: "编辑者", code: "editor2" }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it("软删除 - 删除内置 admin 角色抛出异常", async () => {
    repository.findById.mockResolvedValue({ id: 1, code: "admin" });
    await expect(service.delete(1)).rejects.toThrow(ForbiddenException);
  });

  it("软删除 - 角色不存在抛出异常", async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.delete(999)).rejects.toThrow(NotFoundException);
  });

  it("禁用角色 - 禁用内置 admin 角色抛出异常", async () => {
    repository.findById.mockResolvedValue({ id: 1, code: "admin" });
    await expect(service.updateStatus(1, "disabled")).rejects.toThrow(ForbiddenException);
  });

  it("分配菜单 - 成功调用仓储层", async () => {
    repository.findById.mockResolvedValue({ id: 2, code: "editor" });
    repository.assignMenus.mockResolvedValue(undefined);
    await service.assignMenus(2, [10, 20, 30]);
    expect(repository.assignMenus).toHaveBeenCalledWith(2, [10, 20, 30]);
  });

  it("设置数据范围 - 成功调用仓储层", async () => {
    repository.findById.mockResolvedValue({ id: 2, code: "editor" });
    repository.setDataScope.mockResolvedValue(undefined);
    await service.setDataScope(2, "custom", [101, 102]);
    expect(repository.setDataScope).toHaveBeenCalledWith(2, "custom", [101, 102]);
  });
});
