import { Injectable, Inject, UnprocessableEntityException, NotFoundException } from "@nestjs/common";
import { MenuRepository } from "../repositories/menu.repository";
import { CreateMenuDto, UpdateMenuDto } from "../dtos";
import { Menu } from "@sekiro/shared";

interface MenuNode extends Menu {
  children?: MenuNode[];
}

@Injectable()
export class MenuService {
  constructor(
    @Inject(MenuRepository) private readonly menuRepo: MenuRepository,
  ) {}

  async getTree(status?: string): Promise<MenuNode[]> {
    const list = await this.menuRepo.findAll(status);
    return this.buildTree(list as MenuNode[]);
  }

  async getDetail(id: number) {
    const menu = await this.menuRepo.findById(id);
    if (!menu) {
      throw new NotFoundException("菜单不存在");
    }
    return menu;
  }

  async create(data: CreateMenuDto) {
    // 校验类型约束
    this.validateTypeConstraints(data.type, data);

    // 校验 parentId 是否合法与存在
    if (data.parentId) {
      const parent = await this.menuRepo.findById(data.parentId);
      if (!parent) {
        throw new NotFoundException("父级菜单不存在");
      }
      if (parent.type === "button") {
        throw new UnprocessableEntityException("按钮类型的节点不能作为父级节点");
      }
    }

    return this.menuRepo.create(data);
  }

  async update(id: number, data: UpdateMenuDto) {
    const menu = await this.menuRepo.findById(id);
    if (!menu) {
      throw new NotFoundException("菜单不存在");
    }

    // 校验类型约束（使用已有的菜单类型进行约束）
    this.validateTypeConstraints(menu.type, data);

    // 校验 parentId
    if (data.parentId) {
      const parent = await this.menuRepo.findById(data.parentId);
      if (!parent) {
        throw new NotFoundException("父级菜单不存在");
      }
      if (parent.type === "button") {
        throw new UnprocessableEntityException("按钮类型的节点不能作为父级节点");
      }
      // 环路检测
      await this.validateNoCycle(id, data.parentId);
    }

    return this.menuRepo.update(id, data);
  }

  async delete(id: number) {
    const menu = await this.menuRepo.findById(id);
    if (!menu) {
      throw new NotFoundException("菜单不存在");
    }

    // 检查子节点数量，防止删除非空目录
    const childCount = await this.menuRepo.countChildren(id);
    if (childCount > 0) {
      throw new UnprocessableEntityException("该菜单下有子节点，请先删除子节点");
    }

    return this.menuRepo.delete(id);
  }

  private validateTypeConstraints(type: string, data: any) {
    switch (type) {
      case "directory":
        if (!data.path) {
          throw new UnprocessableEntityException("目录类型必须填写路径");
        }
        break;
      case "menu":
        if (!data.path) {
          throw new UnprocessableEntityException("菜单类型必须填写路径");
        }
        if (!data.component) {
          throw new UnprocessableEntityException("菜单类型必须填写组件路径");
        }
        break;
      case "button":
        if (!data.permission) {
          throw new UnprocessableEntityException("按钮类型必须填写权限标识");
        }
        if (!/^[a-z]+:[a-z]+:[a-z]+$/.test(data.permission)) {
          throw new UnprocessableEntityException("权限标识格式必须为 module:resource:action");
        }
        break;
      default:
        throw new UnprocessableEntityException("不合法的菜单类型");
    }
  }

  private async validateNoCycle(menuId: number, newParentId: number | null): Promise<void> {
    if (newParentId === null) {
      return;
    }
    if (newParentId === menuId) {
      throw new UnprocessableEntityException("不能将菜单移动到自己本身，会形成环路");
    }

    let currentId: number | null = newParentId;
    const visited = new Set<number>();

    while (currentId !== null) {
      if (currentId === menuId) {
        throw new UnprocessableEntityException("不能将菜单移动到自己的子节点下，会形成环路");
      }
      if (visited.has(currentId)) {
        break;
      }
      visited.add(currentId);

      const parent = await this.menuRepo.findById(currentId);
      currentId = parent?.parentId ?? null;
    }
  }

  private buildTree(items: MenuNode[], parentId: number | null = null): MenuNode[] {
    return items
      .filter((item) => item.parentId === parentId)
      .map((item) => ({
        ...item,
        children: this.buildTree(items, item.id),
      }));
  }
}
