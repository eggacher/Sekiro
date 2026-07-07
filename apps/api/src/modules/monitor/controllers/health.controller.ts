import { Controller, Get } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { ApiTags } from "@nestjs/swagger";
import type { ApiResponse } from "@sekiro/shared";

@ApiTags('Health')
@Controller("health")
export class HealthController {
  @Get()
  @SkipThrottle()
  check(): ApiResponse<{ status: string; uptime: number }> {
    return {
      code: 0,
      message: "ok",
      data: { status: "up", uptime: process.uptime() },
    };
  }
}
