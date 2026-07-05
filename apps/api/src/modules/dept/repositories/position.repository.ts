import { Injectable, Inject } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreatePositionDto, UpdatePositionDto, QueryPositionDto } from "../dtos";

@Injectable()
export class PositionRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async findById(id: number) {
    return this.prisma.position.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByName(name: string) {
    return this.prisma.position.findFirst({
      where: { name, deletedAt: null },
    });
  }

  async findByCode(code: string) {
    return this.prisma.position.findFirst({
      where: { code, deletedAt: null },
    });
  }

  async countActiveUsers(positionId: number) {
    return this.prisma.userPosition.count({
      where: {
        positionId,
        user: { deletedAt: null },
      },
    });
  }

  async create(data: CreatePositionDto) {
    return this.prisma.position.create({
      data: {
        name: data.name,
        code: data.code,
        sort: data.sort ?? 0,
        status: data.status ?? "enabled",
      },
    });
  }

  async update(id: number, data: UpdatePositionDto) {
    return this.prisma.position.update({
      where: { id },
      data: {
        name: data.name,
        sort: data.sort,
        status: data.status,
      },
    });
  }

  async softDelete(id: number) {
    await this.prisma.$transaction(async (tx) => {
      await tx.userPosition.deleteMany({
        where: { positionId: id },
      });
      await tx.position.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });
  }

  async findPage(query: QueryPositionDto) {
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

    const total = await this.prisma.position.count({ where });
    const list = await this.prisma.position.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { sort: "asc" },
    });
    return { list, total, page, pageSize };
  }
}
