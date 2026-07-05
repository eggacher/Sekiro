import { Injectable, Inject } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateDeptDto, UpdateDeptDto, QueryDeptDto } from "../dtos";

@Injectable()
export class DeptRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async findAll(query: QueryDeptDto) {
    const where: any = { deletedAt: null };
    if (query.status) {
      where.status = query.status;
    }
    if (query.keyword) {
      where.name = { contains: query.keyword };
    }
    return this.prisma.dept.findMany({
      where,
      orderBy: { sort: "asc" },
    });
  }

  async findById(id: number) {
    return this.prisma.dept.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async countActiveChildren(parentId: number) {
    return this.prisma.dept.count({
      where: { parentId, deletedAt: null },
    });
  }

  async countActiveUsers(deptId: number) {
    return this.prisma.user.count({
      where: { deptId, deletedAt: null },
    });
  }

  async create(data: CreateDeptDto) {
    return this.prisma.dept.create({
      data: {
        parentId: data.parentId ?? null,
        name: data.name,
        leader: data.leader ?? null,
        phone: data.phone ?? null,
        sort: data.sort ?? 0,
        status: data.status ?? "enabled",
      },
    });
  }

  async update(id: number, data: UpdateDeptDto) {
    return this.prisma.dept.update({
      where: { id },
      data: {
        parentId: data.parentId ?? null,
        name: data.name,
        leader: data.leader ?? null,
        phone: data.phone ?? null,
        sort: data.sort,
        status: data.status,
      },
    });
  }

  async softDelete(id: number) {
    await this.prisma.$transaction(async (tx) => {
      await tx.roleDept.deleteMany({
        where: { deptId: id },
      });
      await tx.dept.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
  }
}
