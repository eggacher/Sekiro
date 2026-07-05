import { Module } from "@nestjs/common";
import { RoleController } from "./role.controller";
import { RoleService } from "./services/role.service";
import { RoleRepository } from "./repositories/role.repository";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [RoleController],
  providers: [RoleService, RoleRepository],
  exports: [RoleService, RoleRepository],
})
export class RoleModule {}
