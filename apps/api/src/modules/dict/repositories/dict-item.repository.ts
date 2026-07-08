import { Injectable, Inject } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateDictItemDto, UpdateDictItemDto, QueryDictItemDto } from "../dtos";

@Injectable()
export class DictItemRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async findById(id: number) {
    return this.prisma.dictItem.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByValue(typeId: number, value: string) {
    return this.prisma.dictItem.findFirst({
      where: { typeId, value, deletedAt: null },
    });
  }

  async findPage(query: QueryDictItemDto) {
    const where: any = { deletedAt: null };

    if (query.typeId) {
      where.typeId = Number(query.typeId);
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.keyword) {
      where.OR = [
        { label: { contains: query.keyword } },
        { value: { contains: query.keyword } },
      ];
    }

    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;

    const total = await this.prisma.dictItem.count({ where });
    const list = await this.prisma.dictItem.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { sort: "asc" },
    });

    return { list, total, page, pageSize };
  }

  async create(data: CreateDictItemDto) {
    return this.prisma.dictItem.create({
      data: {
        typeId: data.typeId,
        label: data.label,
        value: data.value,
        sort: data.sort ?? 0,
        status: data.status ?? "enabled",
      },
    });
  }

  async update(id: number, data: UpdateDictItemDto) {
    return this.prisma.dictItem.update({
      where: { id },
      data: {
        label: data.label,
        value: data.value,
        sort: data.sort,
        status: data.status,
      },
    });
  }

  async softDelete(id: number) {
    return this.prisma.dictItem.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findActiveItemsByCode(code: string) {
    return this.prisma.dictItem.findMany({
      where: {
        deletedAt: null,
        status: "enabled",
        type: {
          code,
          deletedAt: null,
          status: "enabled",
        },
      },
      orderBy: { sort: "asc" },
    });
  }
}
