import { Controller, Get, Query, UseGuards, Inject } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { LogService } from "../services/log.service";
import { QueryLoginLogDto, QueryOpLogDto } from "../dtos";
import { ApiResponse as ApiResponseType } from "@sekiro/shared";

@ApiTags('Monitor')
@Controller("monitor")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LogController {
  constructor(
    @Inject(LogService) private readonly logService: LogService,
  ) {}

  @Get("login-log")
  @ApiQuery({ type: QueryLoginLogDto })
  @ApiOperation({ summary: '查询登录日志' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 422, description: '参数校验失败' })
  async getLoginLogs(@Query() query: QueryLoginLogDto): Promise<ApiResponseType<any>> {
    const data = await this.logService.getLoginLogPage(query);
    return { code: 0, message: "查询成功", data };
  }

  @Get("operation-log")
  @ApiQuery({ type: QueryOpLogDto })
  @ApiOperation({ summary: '查询操作日志' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 422, description: '参数校验失败' })
  async getOpLogs(@Query() query: QueryOpLogDto): Promise<ApiResponseType<any>> {
    const data = await this.logService.getOpLogPage(query);
    return { code: 0, message: "查询成功", data };
  }
}
