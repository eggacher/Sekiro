import { Injectable, Inject } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateUserDto, UpdateUserDto, QueryUserDto } from "../dtos";
import { UserDataScope } from "../../auth/types";
import type { PageResult } from "@sekiro/shared";
import type { Prisma } from "@prisma/client";

type UserSensitive = Prisma.UserGetPayload<{
  select: { id: true; passwordHash: true };
}>;

/**
 * 用户列表/详情查询统一关联：部门、角色、岗位。
 * 抽取为常量保证 findById 与 findPage 的 include 形状完全一致，
 * 便于用 Prisma.UserGetPayload 推断安全类型。
 */
const USER_INCLUDE = {
  dept: true,
  roles: { include: { role: true } },
  positions: { include: { position: true } },
} satisfies Prisma.UserInclude;

type UserWithRelations = Prisma.UserGetPayload<{ include: typeof USER_INCLUDE }>;

/**
 * 用户仓库对外返回的安全类型：仅包含共享 User 类型声明的字段以及角色/岗位数组，
 * 不包含 passwordHash、loginFailCount、lockedUntil 等敏感内部字段。
 * 字段可空性与 Prisma 模型保持一致，避免强制转换改变接口行为。
 */
type UserWithPositions = {
  id: number;
  username: string;
  nickname: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  deptId: number | null;
  deptName: string | null;
  roleIds: number[];
  roleNames: string[];
  status: string;
  lastLoginTime?: string;
  createdAt: string;
  positionIds: number[];
  positionNames: string[];
};

/**
 * 将带关联的 Prisma User 映射为对外 DTO：角色按 roleId、岗位按 position.sort
 * 稳定排序，并剥离敏感字段。findById 与 findPage 共用以避免映射逻辑分叉。
 */
function toUserDto(user: UserWithRelations): UserWithPositions {
  const sortedRoles = [...user.roles].sort((a, b) => a.roleId - b.roleId);
  const sortedPositions = [...user.positions].sort(
    (a, b) =>
      (a.position.sort ?? 0) - (b.position.sort ?? 0) ||
      a.positionId - b.positionId,
  );
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    email: user.email,
    phone: user.phone,
    avatar: user.avatar,
    deptId: user.deptId,
    deptName: user.dept?.name ?? null,
    roleIds: sortedRoles.map((ur) => ur.roleId),
    roleNames: sortedRoles.map((ur) => ur.role.name),
    status: user.status,
    lastLoginTime: user.lastLoginAt?.toISOString(),
    createdAt: user.createdAt.toISOString(),
    positionIds: sortedPositions.map((up) => up.positionId),
    positionNames: sortedPositions.map((up) => up.position.name),
  };
}

@Injectable()
export class UserRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async findById(id: number): Promise<UserWithPositions | null> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: USER_INCLUDE,
    });
    if (!user) return null;
    return toUserDto(user);
  }

  /**
   * 内部使用：返回包含敏感字段（如 passwordHash）的原始 Prisma User 形状。
   * 仅用于改密、重置密码等需要校验或写入密码哈希的场景，禁止直接作为接口响应返回。
   */
  async findSensitiveById(id: number): Promise<UserSensitive | null> {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, passwordHash: true },
    });
  }

  async findByUsername(username: string) {
    return this.prisma.user.findFirst({
      where: { username, deletedAt: null },
    });
  }

  async create(data: CreateUserDto, passwordHash: string) {
    return this.prisma.user.create({
      data: {
        username: data.username,
        nickname: data.nickname,
        email: data.email,
        phone: data.phone,
        avatar: data.avatar,
        deptId: data.deptId,
        passwordHash,
      },
    });
  }

  async update(id: number, data: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: {
        nickname: data.nickname,
        email: data.email,
        phone: data.phone,
        avatar: data.avatar,
        deptId: data.deptId,
      },
    });
  }

  async softDelete(id: number) {
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async updateStatus(id: number, status: string) {
    return this.prisma.user.update({
      where: { id },
      data: { status },
    });
  }

  async updatePassword(id: number, passwordHash: string) {
    return this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  }

  async findPage(query: QueryUserDto, scope: UserDataScope): Promise<PageResult<UserWithPositions>> {
    const where: any = { deletedAt: null };

    if (query.status) {
      where.status = query.status;
    }

    if (query.keyword) {
      where.OR = [
        { username: { contains: query.keyword } },
        { nickname: { contains: query.keyword } },
      ];
    }

    if (scope.isSelf) {
      where.id = scope.userId;
    } else if (!scope.isAll) {
      const allowedDepts = scope.deptIds;
      if (query.deptId) {
        where.deptId = allowedDepts.includes(Number(query.deptId)) ? Number(query.deptId) : -1;
      } else {
        where.deptId = { in: allowedDepts };
      }
    } else if (query.deptId) {
      where.deptId = Number(query.deptId);
    }

    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const total = await this.prisma.user.count({ where });
    const rawList = await this.prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      include: USER_INCLUDE,
    });

    const list = rawList.map(toUserDto);

    return {
      list,
      total,
      page,
      pageSize,
    };
  }

  async assignRoles(id: number, roleIds: number[]) {
    await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({ where: { userId: id } });
      if (roleIds.length > 0) {
        await tx.userRole.createMany({
          data: roleIds.map((roleId) => ({ userId: id, roleId })),
        });
      }
    });
  }

  async assignPositions(id: number, positionIds: number[]) {
    await this.prisma.$transaction(async (tx) => {
      await tx.userPosition.deleteMany({ where: { userId: id } });
      if (positionIds.length > 0) {
        await tx.userPosition.createMany({
          data: positionIds.map((positionId) => ({ userId: id, positionId })),
        });
      }
    });
  }
}
