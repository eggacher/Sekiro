import { Module } from "@nestjs/common";
import { DictController } from "./dict.controller";
import { DictItemController } from "./dict-item.controller";
import { DictService } from "./services/dict.service";
import { DictTypeRepository } from "./repositories/dict-type.repository";
import { DictItemRepository } from "./repositories/dict-item.repository";
import { PrismaModule } from "../prisma";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DictController, DictItemController],
  providers: [DictService, DictTypeRepository, DictItemRepository],
  exports: [DictService],
})
export class DictModule {}
