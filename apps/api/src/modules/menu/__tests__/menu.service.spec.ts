import { describe, it, expect, beforeEach, vi } from "vitest";
import { MenuService } from "../services/menu.service";
import { UnprocessableEntityException, NotFoundException } from "@nestjs/common";

describe("MenuService", () => {
  let service: MenuService;
  let repository: any;

  beforeEach(() => {
    repository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      countChildren: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    service = new MenuService(repository);
  });

  it("创建目录类型但未填 path 抛出异常", async () => {
    await expect(
      service.create({
        title: "系统管理",
        type: "directory",
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it("创建菜单类型但未填 component 抛出异常", async () => {
    await expect(
      service.create({
        title: "用户管理",
        type: "menu",
        path: "/system/user",
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it("创建按钮类型但未填 permission 抛出异常", async () => {
    await expect(
      service.create({
        title: "删除按钮",
        type: "button",
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it("创建按钮类型但 permission 格式错 抛出异常", async () => {
    await expect(
      service.create({
        title: "删除按钮",
        type: "button",
        permission: "wrong_format",
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it("新建菜单时如果 parentId 不存在抛出异常", async () => {
    repository.findById.mockResolvedValue(null);
    await expect(
      service.create({
        parentId: 999,
        title: "用户管理",
        type: "directory",
        path: "/system/user",
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it("更新菜单导致环路 (INV-4) 抛出异常", async () => {
    // 假设菜单关系： 1 (根) -> 2 (系统管理) -> 21 (用户管理)
    // 试图将 2 的 parentId 设为 21
    repository.findById.mockImplementation(async (id: number) => {
      if (id === 2) {
        return { id: 2, parentId: 1, title: "系统管理", type: "directory" };
      }
      if (id === 21) {
        return { id: 21, parentId: 2, title: "用户管理", type: "menu" };
      }
      return null;
    });

    await expect(
      service.update(2, {
        parentId: 21,
        title: "系统管理",
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it("删除有子节点的菜单 (INV-5) 抛出异常", async () => {
    repository.findById.mockResolvedValue({ id: 2, title: "系统管理" });
    repository.countChildren.mockResolvedValue(2); // 有 2 个子节点
    await expect(service.delete(2)).rejects.toThrow(UnprocessableEntityException);
  });

  it("菜单不存在时修改抛出异常", async () => {
    repository.findById.mockResolvedValue(null);
    await expect(
      service.update(999, { title: "不存在" }),
    ).rejects.toThrow(NotFoundException);
  });

  it("正常创建菜单", async () => {
    repository.create.mockResolvedValue({ id: 10, title: "新建" });
    const res = await service.create({
      title: "正常目录",
      type: "directory",
      path: "/normal",
    });
    expect(res.title).toBe("新建");
  });

  it("查询菜单树并结构嵌套", async () => {
    repository.findAll.mockResolvedValue([
      { id: 1, parentId: null, title: "工作台", type: "menu", sort: 1 },
      { id: 2, parentId: null, title: "系统管理", type: "directory", sort: 2 },
      { id: 21, parentId: 2, title: "用户管理", type: "menu", sort: 1 },
    ]);

    const tree = await service.getTree();
    expect(tree).toHaveLength(2);
    expect(tree[0].id).toBe(1);
    expect(tree[1].id).toBe(2);
    expect(tree[1].children).toHaveLength(1);
    expect(tree[1].children?.[0].id).toBe(21);
  });
});
