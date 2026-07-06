import { Controller, Get } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { ApiTags } from "@nestjs/swagger";

@ApiTags('Health')
@Controller("health")
export class HealthController {
  @Get()
  @SkipThrottle()
  check() {
    return { status: "up", uptime: process.uptime() };
  }
}
