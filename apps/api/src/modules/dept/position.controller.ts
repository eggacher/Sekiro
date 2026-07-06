import {
  Controller, Get, Post, Put, Delete,
  Body, Query, Param, UseGuards,
  ParseIntPipe, HttpCode, Inject,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { PositionService } from "./services/position.service";
import { CreatePositionDto, UpdatePositionDto, QueryPositionDto } from "./dtos";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ApiResponse as ApiResponseType } from "@sekiro/shared";

@ApiTags('Position')
@Controller("system/position")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PositionController {
  constructor(
    @Inject(PositionService) private readonly positionService: PositionService,
  ) {}

  @Get()
  @ApiQuery({ type: QueryPositionDto })
  @ApiOperation({ summary: '分页查询岗位列表' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 422, description: '参数校验失败' })
  async getPage(@Query() query: QueryPositionDto): Promise<ApiResponseType<any>> {
    const data = await this.positionService.getPage(query);
    return { code: 0, message: "查询成功", data };
  }

  @Get(":id")
  @ApiOperation({ summary: '获取岗位详情' })
  @ApiResponse({ status: 200, description: '成功' })
  async getDetail(@Param("id", ParseIntPipe) id: number): Promise<ApiResponseType<any>> {
    const data = await this.positionService.getDetail(id);
    return { code: 0, message: "查询成功", data };
  }

  @Post()
  @HttpCode(200)
  @ApiBody({ type: CreatePositionDto })
  @ApiOperation({ summary: '创建岗位' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 422, description: '参数校验失败' })
  async create(@Body() createDto: CreatePositionDto): Promise<ApiResponseType<any>> {
    const data = await this.positionService.create(createDto);
    return { code: 0, message: "创建成功", data };
  }

  @Put(":id")
  @HttpCode(200)
  @ApiBody({ type: UpdatePositionDto })
  @ApiOperation({ summary: '更新岗位' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 422, description: '参数校验失败' })
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateDto: UpdatePositionDto,
  ): Promise<ApiResponseType<any>> {
    const data = await this.positionService.update(id, updateDto);
    return { code: 0, message: "更新成功", data };
  }

  @Delete(":id")
  @HttpCode(200)
  @ApiOperation({ summary: '删除岗位' })
  @ApiResponse({ status: 200, description: '成功' })
  async delete(@Param("id", ParseIntPipe) id: number): Promise<ApiResponseType<any>> {
    await this.positionService.delete(id);
    return { code: 0, message: "删除成功", data: null };
  }
}
