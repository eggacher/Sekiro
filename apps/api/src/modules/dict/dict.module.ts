import { Module } from "@nestjs/common";
import { DictController } from "./dict.controller";
import { DictItemController } from "./dict-item.controller";
import { DictService } from "./services/dict.service";
import { DictTypeRepository } from "./repositories/dict-type.repository";
import { DictItemRepository } from "./repositories/dict-item.repository";
import { PrismaModule } from "../prisma";

@Module({
  imports: [PrismaModule],
  controllers: [DictController, DictItemController],
  providers: [DictService, DictTypeRepository, DictItemRepository],
  exports: [DictService],
})
export class DictModule {}
