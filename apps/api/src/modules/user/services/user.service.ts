import { Injectable, Inject, ForbiddenException, UnprocessableEntityException, NotFoundException } from "@nestjs/common";
import { UserRepository } from "../repositories/user.repository";
import { CreateUserDto, UpdateUserDto, QueryUserDto } from "../dtos";
import * as bcrypt from "bcrypt";

import { UserDataScope } from "../../auth/types";

@Injectable()
export class UserService {
  constructor(
    @Inject(UserRepository) private readonly userRepo: UserRepository,
  ) {}

  async getPage(query: QueryUserDto, scope: UserDataScope) {
    return this.userRepo.findPage(query, scope);
  }

  async getDetail(id: number) {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundException("用户不存在");
    }
    return user;
  }

  async create(data: CreateUserDto) {
    const existing = await this.userRepo.findByUsername(data.username);
    if (existing) {
      throw new UnprocessableEntityException("用户名已存在");
    }
    const defaultPasswordHash = await bcrypt.hash("sekiro123", 10);
    return this.userRepo.create(data, defaultPasswordHash);
  }

  async update(id: number, data: UpdateUserDto) {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundException("用户不存在");
    }
    return this.userRepo.update(id, data);
  }

  async delete(id: number, currentUser: { id: number }) {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundException("用户不存在");
    }
    if (id === 1) {
      throw new ForbiddenException("超级管理员账号不可删除");
    }
    if (id === currentUser.id) {
      throw new ForbiddenException("不能删除当前登录的自己");
    }
    return this.userRepo.softDelete(id);
  }

  async updateStatus(id: number, status: string) {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundException("用户不存在");
    }
    if (id === 1 && status === "disabled") {
      throw new ForbiddenException("不可停用超级管理员账号");
    }
    return this.userRepo.updateStatus(id, status);
  }

  async resetPassword(id: number) {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundException("用户不存在");
    }
    const defaultPasswordHash = await bcrypt.hash("sekiro123", 10);
    return this.userRepo.updatePassword(id, defaultPasswordHash);
  }

  async assignRoles(id: number, roleIds: number[]) {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundException("用户不存在");
    }
    return this.userRepo.assignRoles(id, roleIds);
  }

  async assignPositions(id: number, positionIds: number[]) {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundException("用户不存在");
    }
    return this.userRepo.assignPositions(id, positionIds);
  }
}
