import { describe, it, expect, beforeEach, vi } from "vitest";
import { UserService } from "../services/user.service";
import { ForbiddenException, UnprocessableEntityException, NotFoundException } from "@nestjs/common";

describe("UserService", () => {
  let service: UserService;
  let repository: any;

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
      findByUsername: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      updateStatus: vi.fn(),
      updatePassword: vi.fn(),
      findPage: vi.fn(),
    };
    service = new UserService(repository);
  });

  it("新建用户 - 用户名已存在抛出异常", async () => {
    repository.findByUsername.mockResolvedValue({ id: 2, username: "tom" });
    await expect(service.create({ username: "tom", nickname: "Tom" })).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it("软删除 - 删除超级管理员ID为1抛出异常", async () => {
    repository.findById.mockResolvedValue({ id: 1, username: "admin" });
    await expect(service.delete(1, { id: 2 })).rejects.toThrow(ForbiddenException);
  });

  it("软删除 - 删除自己抛出异常", async () => {
    repository.findById.mockResolvedValue({ id: 3, username: "jerry" });
    await expect(service.delete(3, { id: 3 })).rejects.toThrow(ForbiddenException);
  });

  it("禁用用户 - 禁用管理员ID为1抛出异常", async () => {
    repository.findById.mockResolvedValue({ id: 1, username: "admin" });
    await expect(service.updateStatus(1, "disabled")).rejects.toThrow(ForbiddenException);
  });
});
