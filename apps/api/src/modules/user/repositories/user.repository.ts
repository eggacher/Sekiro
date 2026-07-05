import { Injectable, Inject } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateUserDto, UpdateUserDto, QueryUserDto } from "../dtos";

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

  async findPage(query: QueryUserDto, deptIdsScope: number[] | null) {
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

    if (query.deptId) {
      where.deptId = query.deptId;
    } else if (deptIdsScope !== null) {
      where.deptId = { in: deptIdsScope };
    }

    const total = await this.prisma.user.count({ where });
    const list = await this.prisma.user.findMany({
      where,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      orderBy: { createdAt: "desc" },
    });

    return {
      list,
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
}
