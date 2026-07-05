import { Injectable, Inject, UnprocessableEntityException, NotFoundException } from "@nestjs/common";
import { DeptRepository } from "../repositories/dept.repository";
import { CreateDeptDto, UpdateDeptDto, QueryDeptDto } from "../dtos";
import { UserDataScope } from "../auth/types";
import { Dept } from "@sekiro/shared";

interface DeptNode extends Dept {
  children?: DeptNode[];
}

@Injectable()
export class DeptService {
  constructor(
    @Inject(DeptRepository) private readonly deptRepo: DeptRepository,
  ) {}

  async getTree(query: QueryDeptDto, scope: UserDataScope): Promise<DeptNode[]> {
    const list = await this.deptRepo.findAll(query, scope);
    return this.buildTree(list as DeptNode[]);
  }

  async getDetail(id: number) {
    const dept = await this.deptRepo.findById(id);
    if (!dept) {
      throw new NotFoundException("部门不存在");
    }
    return dept;
  }

  async create(data: CreateDeptDto) {
    if (data.parentId) {
      const parent = await this.deptRepo.findById(data.parentId);
      if (!parent) {
        throw new NotFoundException("父级部门不存在");
      }
    }
    return this.deptRepo.create(data);
  }

  async update(id: number, data: UpdateDeptDto) {
    const dept = await this.deptRepo.findById(id);
    if (!dept) {
      throw new NotFoundException("部门不存在");
    }

    if (data.parentId) {
      const parent = await this.deptRepo.findById(data.parentId);
      if (!parent) {
        throw new NotFoundException("父级部门不存在");
      }
      // 环路检测
      await this.validateNoCycle(id, data.parentId);
    }

    return this.deptRepo.update(id, data);
  }

  async delete(id: number) {
    const dept = await this.deptRepo.findById(id);
    if (!dept) {
      throw new NotFoundException("部门不存在");
    }

    // 1. 检查是否有活跃的子部门
    const childCount = await this.deptRepo.countActiveChildren(id);
    if (childCount > 0) {
      throw new UnprocessableEntityException("该部门下有未删除的子部门，请先处理子部门");
    }

    // 2. 检查是否有活跃的关联用户
    const userCount = await this.deptRepo.countActiveUsers(id);
    if (userCount > 0) {
      throw new UnprocessableEntityException("该部门下有关联的活跃用户，请先处理用户");
    }

    return this.deptRepo.softDelete(id);
  }

  private async validateNoCycle(deptId: number, newParentId: number | null): Promise<void> {
    if (newParentId === null) {
      return;
    }
    if (newParentId === deptId) {
      throw new UnprocessableEntityException("不能将部门移动到自己本身，会形成环路");
    }

    let currentId: number | null = newParentId;
    const visited = new Set<number>();

    while (currentId !== null) {
      if (currentId === deptId) {
        throw new UnprocessableEntityException("不能将部门移动到自己的子节点下，会形成环路");
      }
      if (visited.has(currentId)) {
        break;
      }
      visited.add(currentId);

      const parent = await this.deptRepo.findById(currentId);
      currentId = parent?.parentId ?? null;
    }
  }

  private buildTree(items: DeptNode[], parentId: number | null = null): DeptNode[] {
    return items
      .filter((item) => item.parentId === parentId)
      .map((item) => ({
        ...item,
        children: this.buildTree(items, item.id),
      }));
  }
}
