import { Module } from "@nestjs/common";
import { PrismaModule } from "./modules/prisma";
import { RedisModule } from "./redis.module";
import { AuthModule } from "./modules/auth";
import { UserModule } from "./modules/user";
import { RoleModule } from "./modules/role";
import { MenuModule } from "./modules/menu";
import { DeptModule } from "./modules/dept";
import { DictModule } from "./modules/dict";
import { MonitorModule } from "./modules/monitor";
import { SecurityModule } from "./modules/security";
import { UploadModule } from "./modules/upload/upload.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    SecurityModule,
    UploadModule,
    PrismaModule,
    RedisModule,
    AuthModule,
    UserModule,
    RoleModule,
    MenuModule,
    DeptModule,
    DictModule,
    MonitorModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
