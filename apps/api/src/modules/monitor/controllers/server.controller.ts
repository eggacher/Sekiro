import { Controller, Get, UseGuards, Inject } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { ServerService } from "../services/server.service";
import { ApiResponse as ApiResponseType } from "@sekiro/shared";

@ApiTags('Monitor')
@Controller("monitor/server")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ServerController {
  constructor(
    @Inject(ServerService) private readonly serverService: ServerService,
  ) {}

  @Get()
  @ApiOperation({ summary: '获取服务器监控信息' })
  @ApiResponse({ status: 200, description: '成功' })
  async getInfo(): Promise<ApiResponseType<any>> {
    const data = await this.serverService.getServerInfo();
    return { code: 0, message: "获取成功", data };
  }
}
