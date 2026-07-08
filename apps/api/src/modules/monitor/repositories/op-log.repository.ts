import { Injectable, Inject } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { QueryOpLogDto } from "../dtos";
import { Prisma } from "@prisma/client";

@Injectable()
export class OpLogRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(data: Prisma.OperationLogCreateInput) {
    return this.prisma.operationLog.create({ data });
  }

  async findPage(query: QueryOpLogDto) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 10;
    const where: Prisma.OperationLogWhereInput = {};

    if (query.operator) {
      where.operator = { contains: query.operator };
    }
    if (query.module) {
      where.module = { contains: query.module };
    }
    if (query.type) {
      where.type = query.type;
    }

    const [total, list] = await Promise.all([
      this.prisma.operationLog.count({ where }),
      this.prisma.operationLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { list, total, page, pageSize };
  }
}
