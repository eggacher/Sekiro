import { Controller, Get, Delete, Query, Param, UseGuards, HttpCode } from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { OnlineService } from "../services/online.service";
import { ApiResponse } from "@sekiro/shared";

@Controller("monitor/online")
@UseGuards(JwtAuthGuard)
export class OnlineController {
  constructor(private readonly onlineService: OnlineService) {}

  @Get()
  async list(
    @Query("username") username?: string,
    @Query("ip") ip?: string,
  ): Promise<ApiResponse<any>> {
    const data = await this.onlineService.getOnlineUsers({ username, ip });
    return { code: 0, message: "查询成功", data };
  }

  @Delete(":id")
  @HttpCode(200)
  async kick(@Param("id") id: string): Promise<ApiResponse<any>> {
    await this.onlineService.forceLogout(id);
    return { code: 0, message: "已强制下线", data: null };
  }
}
