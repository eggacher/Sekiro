import { Injectable, Inject } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateDictDto, UpdateDictDto, QueryDictDto } from "../dtos";

@Injectable()
export class DictTypeRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async findById(id: number) {
    return this.prisma.dictType.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByCode(code: string) {
    return this.prisma.dictType.findFirst({
      where: { code, deletedAt: null },
    });
  }

  async findPage(query: QueryDictDto) {
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

    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 10;

    const total = await this.prisma.dictType.count({ where });
    const list = await this.prisma.dictType.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    });

    return { list, total, page, pageSize };
  }

  async create(data: CreateDictDto) {
    return this.prisma.dictType.create({
      data: {
        name: data.name,
        code: data.code,
        remark: data.remark ?? null,
        status: data.status ?? "enabled",
      },
    });
  }

  async update(id: number, data: UpdateDictDto) {
    return this.prisma.dictType.update({
      where: { id },
      data: {
        name: data.name,
        status: data.status,
        remark: data.remark ?? null,
      },
    });
  }

  async softDelete(id: number) {
    await this.prisma.$transaction(async (tx) => {
      // 级联逻辑删除字典项
      await tx.dictItem.updateMany({
        where: { typeId: id, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      // 逻辑删除字典类型
      await tx.dictType.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
  }
}
