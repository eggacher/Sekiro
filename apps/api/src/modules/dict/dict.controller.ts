import {
  Controller, Get, Post, Put, Delete,
  Body, Query, Param, UseGuards,
  ParseIntPipe, HttpCode, Inject,
} from "@nestjs/common";
import { DictService } from "./services/dict.service";
import { CreateDictDto, UpdateDictDto, QueryDictDto } from "./dtos";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ApiResponse } from "@sekiro/shared";

@Controller("system/dict")
@UseGuards(JwtAuthGuard)
export class DictController {
  constructor(
    @Inject(DictService) private readonly dictService: DictService,
  ) {}

  @Get()
  async getPage(@Query() query: QueryDictDto): Promise<ApiResponse<any>> {
    const data = await this.dictService.getTypePage(query);
    return { code: 0, message: "查询成功", data };
  }

  @Get(":id")
  async getDetail(@Param("id", ParseIntPipe) id: number): Promise<ApiResponse<any>> {
    const data = await this.dictService.getTypeDetail(id);
    return { code: 0, message: "查询成功", data };
  }

  @Post()
  @HttpCode(200)
  async create(@Body() createDto: CreateDictDto): Promise<ApiResponse<any>> {
    const data = await this.dictService.createType(createDto);
    return { code: 0, message: "创建成功", data };
  }

  @Put(":id")
  @HttpCode(200)
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateDto: UpdateDictDto,
  ): Promise<ApiResponse<any>> {
    const data = await this.dictService.updateType(id, updateDto);
    return { code: 0, message: "更新成功", data };
  }

  @Delete(":id")
  @HttpCode(200)
  async delete(@Param("id", ParseIntPipe) id: number): Promise<ApiResponse<any>> {
    await this.dictService.deleteType(id);
    return { code: 0, message: "删除成功", data: null };
  }

  @Get(":code/items")
  async getItemsByCode(@Param("code") code: string): Promise<ApiResponse<any>> {
    const data = await this.dictService.getActiveItemsByCode(code);
    return { code: 0, message: "查询成功", data };
  }
}
