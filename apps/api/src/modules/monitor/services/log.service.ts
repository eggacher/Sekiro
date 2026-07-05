import { Injectable } from "@nestjs/common";
import { LoginLogRepository } from "../repositories/login-log.repository";
import { OpLogRepository } from "../repositories/op-log.repository";
import { QueryLoginLogDto, QueryOpLogDto } from "../dtos";
import { Prisma } from "@prisma/client";

@Injectable()
export class LogService {
  constructor(
    private readonly loginLogRepo: LoginLogRepository,
    private readonly opLogRepo: OpLogRepository,
  ) {}

  async createLoginLog(data: Prisma.LoginLogCreateInput) {
    return this.loginLogRepo.create(data);
  }

  async getLoginLogPage(query: QueryLoginLogDto) {
    return this.loginLogRepo.findPage(query);
  }

  async createOpLog(data: Prisma.OperationLogCreateInput) {
    return this.opLogRepo.create(data);
  }

  async getOpLogPage(query: QueryOpLogDto) {
    return this.opLogRepo.findPage(query);
  }
}
