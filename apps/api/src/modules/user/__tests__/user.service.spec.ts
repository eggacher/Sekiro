import { describe, it, expect, beforeEach, vi } from "vitest";
import { UserService } from "../services/user.service";
import { ForbiddenException, UnprocessableEntityException, NotFoundException } from "@nestjs/common";
import { md5 } from "../../../common/utils/crypto.util";
import * as bcrypt from "bcrypt";

describe("UserService", () => {
  let service: UserService;
  let repository: any;

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
      findSensitiveById: vi.fn(),
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

  it("修改密码 - 使用 findSensitiveById 返回的 passwordHash 校验旧密码并更新", async () => {
    const passwordHash = await bcrypt.hash("old-pass", 10);
    repository.findSensitiveById.mockResolvedValue({ id: 2, passwordHash });
    repository.updatePassword.mockResolvedValue(undefined);

    await service.changePassword(2, "old-pass", "new-pass");

    expect(repository.findSensitiveById).toHaveBeenCalledWith(2);
    expect(repository.findById).not.toHaveBeenCalled();
    expect(repository.updatePassword).toHaveBeenCalledWith(2, expect.any(String));
  });

  it("修改密码 - 旧密码错误时抛出异常且不更新", async () => {
    const passwordHash = await bcrypt.hash("old-pass", 10);
    repository.findSensitiveById.mockResolvedValue({ id: 2, passwordHash });

    await expect(service.changePassword(2, "wrong-pass", "new-pass")).rejects.toThrow(
      UnprocessableEntityException,
    );
    expect(repository.findSensitiveById).toHaveBeenCalledWith(2);
    expect(repository.updatePassword).not.toHaveBeenCalled();
  });

  it("重置密码 - 通过 findSensitiveById 校验用户存在后更新默认密码", async () => {
    repository.findSensitiveById.mockResolvedValue({ id: 2, passwordHash: "hash" });
    repository.updatePassword.mockResolvedValue(undefined);

    await service.resetPassword(2);

    expect(repository.findSensitiveById).toHaveBeenCalledWith(2);
    expect(repository.findById).not.toHaveBeenCalled();
    expect(repository.updatePassword).toHaveBeenCalledWith(2, expect.any(String));
  });

  it("分配角色 - 成功调用仓储层操作", async () => {
    repository.findById.mockResolvedValue({ id: 2, username: "tom" });
    repository.assignRoles = vi.fn().mockResolvedValue(undefined);
    await service.assignRoles(2, [1, 2]);
    expect(repository.assignRoles).toHaveBeenCalledWith(2, [1, 2]);
  });

  it("分配岗位 - 成功调用仓储层操作", async () => {
    repository.findById.mockResolvedValue({ id: 2, username: "tom" });
    repository.assignPositions = vi.fn().mockResolvedValue(undefined);
    await service.assignPositions(2, [3, 4]);
    expect(repository.assignPositions).toHaveBeenCalledWith(2, [3, 4]);
  });

  it("新建用户 - 默认密码应为 md5(sekiro123) 的 bcrypt", async () => {
    repository.findByUsername.mockResolvedValue(null);
    repository.create.mockResolvedValue({ id: 3, username: "jerry" });

    await service.create({ username: "jerry", nickname: "Jerry" });

    const [, passwordHash] = repository.create.mock.calls[0];
    expect(await bcrypt.compare(md5("sekiro123"), passwordHash)).toBe(true);
  });

  it("修改密码 - 旧密码正确时更新为 md5(新密码) 的 bcrypt", async () => {
    const oldPlain = "oldPwd123";
    const newPlain = "newPwd456";
    repository.findSensitiveById.mockResolvedValue({
      id: 2,
      username: "tom",
      passwordHash: await bcrypt.hash(md5(oldPlain), 10),
    });
    repository.updatePassword.mockResolvedValue(undefined);

    await service.changePassword(2, md5(oldPlain), md5(newPlain));

    const [, newHash] = repository.updatePassword.mock.calls[0];
    expect(await bcrypt.compare(md5(newPlain), newHash)).toBe(true);
  });

  it("修改密码 - 旧密码错误时抛出异常", async () => {
    repository.findSensitiveById.mockResolvedValue({
      id: 2,
      username: "tom",
      passwordHash: await bcrypt.hash(md5("correctOld"), 10),
    });

    await expect(service.changePassword(2, md5("wrongOld"), md5("newPwd"))).rejects.toThrow(
      UnprocessableEntityException,
    );
    expect(repository.updatePassword).not.toHaveBeenCalled();
  });

  it("重置密码 - 应更新为 md5(sekiro123) 的 bcrypt", async () => {
    repository.findSensitiveById.mockResolvedValue({ id: 2, username: "tom" });
    repository.updatePassword.mockResolvedValue(undefined);

    await service.resetPassword(2);

    const [, newHash] = repository.updatePassword.mock.calls[0];
    expect(await bcrypt.compare(md5("sekiro123"), newHash)).toBe(true);
  });
});
