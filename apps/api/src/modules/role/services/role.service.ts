import { Injectable, Inject, ForbiddenException, UnprocessableEntityException, NotFoundException } from "@nestjs/common";
import { RoleRepository } from "../repositories/role.repository";
import { CreateRoleDto, UpdateRoleDto, QueryRoleDto } from "../dtos";

@Injectable()
export class RoleService {
  constructor(
    @Inject(RoleRepository) private readonly roleRepo: RoleRepository,
  ) {}

  async getPage(query: QueryRoleDto) {
    return this.roleRepo.findPage(query);
  }

  async getDetail(id: number) {
    const role = await this.roleRepo.findById(id);
    if (!role) {
      throw new NotFoundException("角色不存在");
    }
    return role;
  }

  async create(data: CreateRoleDto) {
    const existingCode = await this.roleRepo.findByCode(data.code);
    if (existingCode) {
      throw new UnprocessableEntityException("角色编码已存在");
    }
    const existingName = await this.roleRepo.findByName(data.name);
    if (existingName) {
      throw new UnprocessableEntityException("角色名称已存在");
    }
    return this.roleRepo.create(data);
  }

  async update(id: number, data: UpdateRoleDto) {
    const role = await this.roleRepo.findById(id);
    if (!role) {
      throw new NotFoundException("角色不存在");
    }
    const existingName = await this.roleRepo.findByName(data.name);
    if (existingName && existingName.id !== id) {
      throw new UnprocessableEntityException("角色名称已存在");
    }
    return this.roleRepo.update(id, data);
  }

  async delete(id: number) {
    const role = await this.roleRepo.findById(id);
    if (!role) {
      throw new NotFoundException("角色不存在");
    }
    if (id === 1 || role.code === "admin") {
      throw new ForbiddenException("内置超级管理员角色不可删除");
    }
    return this.roleRepo.softDelete(id);
  }

  async updateStatus(id: number, status: string) {
    const role = await this.roleRepo.findById(id);
    if (!role) {
      throw new NotFoundException("角色不存在");
    }
    if ((id === 1 || role.code === "admin") && status === "disabled") {
      throw new ForbiddenException("内置超级管理员角色不可被停用");
    }
    return this.roleRepo.updateStatus(id, status);
  }

  async assignMenus(id: number, menuIds: number[]) {
    const role = await this.roleRepo.findById(id);
    if (!role) {
      throw new NotFoundException("角色不存在");
    }
    return this.roleRepo.assignMenus(id, menuIds);
  }

  async setDataScope(id: number, dataScope: string, customDeptIds: number[]) {
    const role = await this.roleRepo.findById(id);
    if (!role) {
      throw new NotFoundException("角色不存在");
    }
    return this.roleRepo.setDataScope(id, dataScope, customDeptIds);
  }
}
