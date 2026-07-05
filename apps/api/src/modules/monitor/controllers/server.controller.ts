import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { ServerService } from "../services/server.service";
import { ApiResponse } from "@sekiro/shared";

@Controller("monitor/server")
@UseGuards(JwtAuthGuard)
export class ServerController {
  constructor(private readonly serverService: ServerService) {}

  @Get()
  async getInfo(): Promise<ApiResponse<any>> {
    const data = await this.serverService.getServerInfo();
    return { code: 0, message: "获取成功", data };
  }
}
