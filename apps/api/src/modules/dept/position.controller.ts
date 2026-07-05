import {
  Controller, Get, Post, Put, Delete,
  Body, Query, Param, UseGuards,
  ParseIntPipe, HttpCode, Inject,
} from "@nestjs/common";
import { PositionService } from "./services/position.service";
import { CreatePositionDto, UpdatePositionDto, QueryPositionDto } from "./dtos";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ApiResponse } from "@sekiro/shared";

@Controller("system/position")
@UseGuards(JwtAuthGuard)
export class PositionController {
  constructor(
    @Inject(PositionService) private readonly positionService: PositionService,
  ) {}

  @Get()
  async getPage(@Query() query: QueryPositionDto): Promise<ApiResponse<any>> {
    const data = await this.positionService.getPage(query);
    return { code: 0, message: "查询成功", data };
  }

  @Get(":id")
  async getDetail(@Param("id", ParseIntPipe) id: number): Promise<ApiResponse<any>> {
    const data = await this.positionService.getDetail(id);
    return { code: 0, message: "查询成功", data };
  }

  @Post()
  @HttpCode(200)
  async create(@Body() createDto: CreatePositionDto): Promise<ApiResponse<any>> {
    const data = await this.positionService.create(createDto);
    return { code: 0, message: "创建成功", data };
  }

  @Put(":id")
  @HttpCode(200)
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateDto: UpdatePositionDto,
  ): Promise<ApiResponse<any>> {
    const data = await this.positionService.update(id, updateDto);
    return { code: 0, message: "更新成功", data };
  }

  @Delete(":id")
  @HttpCode(200)
  async delete(@Param("id", ParseIntPipe) id: number): Promise<ApiResponse<any>> {
    await this.positionService.delete(id);
    return { code: 0, message: "删除成功", data: null };
  }
}
