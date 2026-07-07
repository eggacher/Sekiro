import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { OnlineController } from "./controllers/online.controller";
import { LogController } from "./controllers/log.controller";
import { ServerController } from "./controllers/server.controller";
import { HealthController } from "./controllers/health.controller";
import { LogService } from "./services/log.service";
import { OnlineService } from "./services/online.service";
import { ServerService } from "./services/server.service";
import { LoginLogRepository } from "./repositories/login-log.repository";
import { OpLogRepository } from "./repositories/op-log.repository";
import { OperationLogInterceptor } from "./interceptors/operation-log.interceptor";
import { AuthModule } from "../auth/auth.module";
import { PrismaModule } from "../prisma";

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [OnlineController, LogController, ServerController, HealthController],
  providers: [
    LogService,
    OnlineService,
    ServerService,
    LoginLogRepository,
    OpLogRepository,
    {
      provide: APP_INTERCEPTOR,
      useClass: OperationLogInterceptor,
    },
  ],
  exports: [LogService],
})
export class MonitorModule {}
