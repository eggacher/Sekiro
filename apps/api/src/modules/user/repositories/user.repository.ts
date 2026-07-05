import { Injectable, Inject } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateUserDto, UpdateUserDto, QueryUserDto } from "../dtos";
import { UserDataScope } from "../../auth/types";

@Injectable()
export class UserRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async findById(id: number) {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
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

  async findPage(query: QueryUserDto, scope: UserDataScope) {
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
    const list = await this.prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
    });

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
