import { Module } from "@nestjs/common";
import { DeptController } from "./dept.controller";
import { PositionController } from "./position.controller";
import { DeptService } from "./services/dept.service";
import { PositionService } from "./services/position.service";
import { DeptRepository } from "./repositories/dept.repository";
import { PositionRepository } from "./repositories/position.repository";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DeptController, PositionController],
  providers: [
    DeptService,
    PositionService,
    DeptRepository,
    PositionRepository,
  ],
  exports: [
    DeptService,
    PositionService,
    DeptRepository,
    PositionRepository,
  ],
})
export class DeptModule {}
