import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { LogService } from "../services/log.service";
import { QueryLoginLogDto, QueryOpLogDto } from "../dtos";
import { ApiResponse } from "@sekiro/shared";

@Controller("monitor")
@UseGuards(JwtAuthGuard)
export class LogController {
  constructor(private readonly logService: LogService) {}

  @Get("login-log")
  async getLoginLogs(@Query() query: QueryLoginLogDto): Promise<ApiResponse<any>> {
    const data = await this.logService.getLoginLogPage(query);
    return { code: 0, message: "查询成功", data };
  }

  @Get("operation-log")
  async getOpLogs(@Query() query: QueryOpLogDto): Promise<ApiResponse<any>> {
    const data = await this.logService.getOpLogPage(query);
    return { code: 0, message: "查询成功", data };
  }
}
