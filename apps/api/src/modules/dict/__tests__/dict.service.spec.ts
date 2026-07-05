import { describe, it, expect, beforeEach, vi } from "vitest";
import { DictService } from "../services/dict.service";
import { UnprocessableEntityException, NotFoundException } from "@nestjs/common";

describe("DictService", () => {
  let service: DictService;
  let typeRepo: any;
  let itemRepo: any;

  beforeEach(() => {
    typeRepo = {
      findById: vi.fn(),
      findByCode: vi.fn(),
      findPage: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
    };
    itemRepo = {
      findById: vi.fn(),
      findByValue: vi.fn(),
      findPage: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      findActiveItemsByCode: vi.fn(),
    };
    service = new DictService(typeRepo, itemRepo);
  });

  it("创建字典类型 - code 已存在抛出 422 异常", async () => {
    typeRepo.findByCode.mockResolvedValue({ id: 1, code: "sys_user_sex" });
    await expect(
      service.createType({ name: "性别", code: "sys_user_sex" }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it("创建字典项 - 同一类型下 value 已存在 (INV-8) 抛出 422 异常", async () => {
    typeRepo.findById.mockResolvedValue({ id: 1, name: "性别" });
    itemRepo.findByValue.mockResolvedValue({ id: 10, typeId: 1, value: "1" });
    await expect(
      service.createItem({ typeId: 1, label: "男", value: "1" }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it("修改字典项 - 修改后的 value 已存在于同类型中抛出异常", async () => {
    itemRepo.findById.mockResolvedValue({ id: 10, typeId: 1, value: "1" });
    itemRepo.findByValue.mockResolvedValue({ id: 11, typeId: 1, value: "2" });
    await expect(
      service.updateItem(10, { label: "女", value: "2", sort: 1, status: "enabled" }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it("修改字典项 - 字典项不存在抛出 404", async () => {
    itemRepo.findById.mockResolvedValue(null);
    await expect(
      service.updateItem(999, { label: "女", value: "2", sort: 1, status: "enabled" }),
    ).rejects.toThrow(NotFoundException);
  });

  it("删除字典类型 - 触发级联删除", async () => {
    typeRepo.findById.mockResolvedValue({ id: 1, name: "性别" });
    typeRepo.softDelete.mockResolvedValue(undefined);
    await service.deleteType(1);
    expect(typeRepo.softDelete).toHaveBeenCalledWith(1);
  });
});
