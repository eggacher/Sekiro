import { Injectable, Inject } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateRoleDto, UpdateRoleDto, QueryRoleDto } from "../dtos";

@Injectable()
export class RoleRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async findById(id: number) {
    return this.prisma.role.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByCode(code: string) {
    return this.prisma.role.findFirst({
      where: { code, deletedAt: null },
    });
  }

  async findByName(name: string) {
    return this.prisma.role.findFirst({
      where: { name, deletedAt: null },
    });
  }

  async create(data: CreateRoleDto) {
    return this.prisma.role.create({
      data: {
        name: data.name,
        code: data.code,
        description: data.description,
      },
    });
  }

  async update(id: number, data: UpdateRoleDto) {
    return this.prisma.role.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
      },
    });
  }

  async softDelete(id: number) {
    return this.prisma.role.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async updateStatus(id: number, status: string) {
    return this.prisma.role.update({
      where: { id },
      data: { status },
    });
  }

  async assignMenus(id: number, menuIds: number[]) {
    await this.prisma.$transaction(async (tx) => {
      await tx.roleMenu.deleteMany({ where: { roleId: id } });
      if (menuIds.length > 0) {
        await tx.roleMenu.createMany({
          data: menuIds.map((menuId) => ({ roleId: id, menuId })),
        });
      }
    });
  }

  async setDataScope(id: number, dataScope: string, customDeptIds: number[]) {
    await this.prisma.$transaction(async (tx) => {
      await tx.role.update({
        where: { id },
        data: { dataScope },
      });
      await tx.roleDept.deleteMany({ where: { roleId: id } });
      if (dataScope === "custom" && customDeptIds.length > 0) {
        await tx.roleDept.createMany({
          data: customDeptIds.map((deptId) => ({ roleId: id, deptId })),
        });
      }
    });
  }

  async findPage(query: QueryRoleDto) {
    const where: any = { deletedAt: null };

    if (query.status) {
      where.status = query.status;
    }

    if (query.keyword) {
      where.OR = [
        { name: { contains: query.keyword } },
        { code: { contains: query.keyword } },
      ];
    }

    const total = await this.prisma.role.count({ where });
    const list = await this.prisma.role.findMany({
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
