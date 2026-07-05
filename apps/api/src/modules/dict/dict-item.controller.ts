import {
  Controller, Get, Post, Put, Delete,
  Body, Query, Param, UseGuards,
  ParseIntPipe, HttpCode, Inject,
} from "@nestjs/common";
import { DictService } from "./services/dict.service";
import { CreateDictItemDto, UpdateDictItemDto, QueryDictItemDto } from "./dtos";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ApiResponse } from "@sekiro/shared";

@Controller("system/dict-item")
@UseGuards(JwtAuthGuard)
export class DictItemController {
  constructor(
    @Inject(DictService) private readonly dictService: DictService,
  ) {}

  @Get()
  async getPage(@Query() query: QueryDictItemDto): Promise<ApiResponse<any>> {
    const data = await this.dictService.getItemPage(query);
    return { code: 0, message: "查询成功", data };
  }

  @Get(":id")
  async getDetail(@Param("id", ParseIntPipe) id: number): Promise<ApiResponse<any>> {
    const data = await this.dictService.getItemDetail(id);
    return { code: 0, message: "查询成功", data };
  }

  @Post()
  @HttpCode(200)
  async create(@Body() createDto: CreateDictItemDto): Promise<ApiResponse<any>> {
    const data = await this.dictService.createItem(createDto);
    return { code: 0, message: "创建成功", data };
  }

  @Put(":id")
  @HttpCode(200)
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateDto: UpdateDictItemDto,
  ): Promise<ApiResponse<any>> {
    const data = await this.dictService.updateItem(id, updateDto);
    return { code: 0, message: "更新成功", data };
  }

  @Delete(":id")
  @HttpCode(200)
  async delete(@Param("id", ParseIntPipe) id: number): Promise<ApiResponse<any>> {
    await this.dictService.deleteItem(id);
    return { code: 0, message: "删除成功", data: null };
  }
}
