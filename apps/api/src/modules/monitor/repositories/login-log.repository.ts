import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { QueryLoginLogDto } from "../dtos";
import { Prisma } from "@prisma/client";

@Injectable()
export class LoginLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.LoginLogCreateInput) {
    return this.prisma.loginLog.create({ data });
  }

  async findPage(query: QueryLoginLogDto) {
    const page = query.page || 1;
    const pageSize = query.pageSize || 10;
    const where: Prisma.LoginLogWhereInput = {};

    if (query.username) {
      where.username = { contains: query.username };
    }
    if (query.ip) {
      where.ip = { contains: query.ip };
    }
    if (query.status) {
      where.result = query.status;
    }

    const [total, list] = await Promise.all([
      this.prisma.loginLog.count({ where }),
      this.prisma.loginLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return { list, total, page, pageSize };
  }
}
