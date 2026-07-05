import { Injectable, Inject } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateMenuDto, UpdateMenuDto } from "../dtos";

@Injectable()
export class MenuRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async findAll(status?: string) {
    const where: any = {};
    if (status) {
      where.status = status;
    }
    return this.prisma.menu.findMany({
      where,
      orderBy: { sort: "asc" },
    });
  }

  async findById(id: number) {
    return this.prisma.menu.findFirst({
      where: { id },
    });
  }

  async countChildren(parentId: number) {
    return this.prisma.menu.count({
      where: { parentId },
    });
  }

  async create(data: CreateMenuDto) {
    return this.prisma.menu.create({
      data: {
        parentId: data.parentId ?? null,
        title: data.title,
        type: data.type,
        path: data.path ?? null,
        component: data.component ?? null,
        icon: data.icon ?? null,
        permission: data.permission ?? null,
        sort: data.sort ?? 0,
        visible: data.visible ?? true,
        cache: data.cache ?? true,
        status: data.status ?? "enabled",
      },
    });
  }

  async update(id: number, data: UpdateMenuDto) {
    return this.prisma.menu.update({
      where: { id },
      data: {
        parentId: data.parentId ?? null,
        title: data.title,
        path: data.path ?? null,
        component: data.component ?? null,
        icon: data.icon ?? null,
        permission: data.permission ?? null,
        sort: data.sort,
        visible: data.visible,
        cache: data.cache,
        status: data.status,
      },
    });
  }

  async delete(id: number) {
    await this.prisma.$transaction(async (tx) => {
      await tx.roleMenu.deleteMany({
        where: { menuId: id },
      });
      await tx.menu.delete({
        where: { id },
      });
    });
  }
}
