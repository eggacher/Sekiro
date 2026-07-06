import { Controller, Get, Delete, Query, Param, UseGuards, HttpCode } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { OnlineService } from "../services/online.service";
import { ApiResponse as ApiResponseType } from "@sekiro/shared";

@ApiTags('Monitor')
@Controller("monitor/online")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OnlineController {
  constructor(private readonly onlineService: OnlineService) {}

  @Get()
  @ApiOperation({ summary: '查询在线用户' })
  @ApiResponse({ status: 200, description: '成功' })
  async list(
    @Query("username") username?: string,
    @Query("ip") ip?: string,
  ): Promise<ApiResponseType<any>> {
    const data = await this.onlineService.getOnlineUsers({ username, ip });
    return { code: 0, message: "查询成功", data };
  }

  @Delete(":id")
  @HttpCode(200)
  @ApiOperation({ summary: '强制下线在线用户' })
  @ApiResponse({ status: 200, description: '成功' })
  async kick(@Param("id") id: string): Promise<ApiResponseType<any>> {
    await this.onlineService.forceLogout(id);
    return { code: 0, message: "已强制下线", data: null };
  }
}
