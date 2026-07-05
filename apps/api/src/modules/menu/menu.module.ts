import { Module } from "@nestjs/common";
import { MenuController } from "./menu.controller";
import { MenuService } from "./services/menu.service";
import { MenuRepository } from "./repositories/menu.repository";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MenuController],
  providers: [MenuService, MenuRepository],
  exports: [MenuService, MenuRepository],
})
export class MenuModule {}
