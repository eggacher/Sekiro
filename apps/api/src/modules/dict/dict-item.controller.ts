import {
  Controller, Get, Post, Put, Delete,
  Body, Query, Param, UseGuards,
  ParseIntPipe, HttpCode, Inject,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { DictService } from "./services/dict.service";
import { CreateDictItemDto, UpdateDictItemDto, QueryDictItemDto } from "./dtos";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { RequiresPermissions } from "../auth/decorators/requires-permissions.decorator";
import { ApiResponse as ApiResponseType, PERMISSIONS } from "@sekiro/shared";

@ApiTags('Dict')
@Controller("system/dict-item")
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class DictItemController {
  constructor(
    @Inject(DictService) private readonly dictService: DictService,
  ) {}

  @Get()
  @ApiQuery({ type: QueryDictItemDto })
  @ApiOperation({ summary: '分页查询字典项' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 422, description: '参数校验失败' })
  async getPage(@Query() query: QueryDictItemDto): Promise<ApiResponseType<any>> {
    const data = await this.dictService.getItemPage(query);
    return { code: 0, message: "查询成功", data };
  }

  @Get(":id")
  @ApiOperation({ summary: '获取字典项详情' })
  @ApiResponse({ status: 200, description: '成功' })
  async getDetail(@Param("id", ParseIntPipe) id: number): Promise<ApiResponseType<any>> {
    const data = await this.dictService.getItemDetail(id);
    return { code: 0, message: "查询成功", data };
  }

  @RequiresPermissions(PERMISSIONS.DICT_ITEM_CREATE)
  @Post()
  @HttpCode(200)
  @ApiBody({ type: CreateDictItemDto })
  @ApiOperation({ summary: '创建字典项' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 422, description: '参数校验失败' })
  async create(@Body() createDto: CreateDictItemDto): Promise<ApiResponseType<any>> {
    const data = await this.dictService.createItem(createDto);
    return { code: 0, message: "创建成功", data };
  }

  @RequiresPermissions(PERMISSIONS.DICT_ITEM_UPDATE)
  @Put(":id")
  @HttpCode(200)
  @ApiBody({ type: UpdateDictItemDto })
  @ApiOperation({ summary: '更新字典项' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 422, description: '参数校验失败' })
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateDto: UpdateDictItemDto,
  ): Promise<ApiResponseType<any>> {
    const data = await this.dictService.updateItem(id, updateDto);
    return { code: 0, message: "更新成功", data };
  }

  @RequiresPermissions(PERMISSIONS.DICT_ITEM_DELETE)
  @Delete(":id")
  @HttpCode(200)
  @ApiOperation({ summary: '删除字典项' })
  @ApiResponse({ status: 200, description: '成功' })
  async delete(@Param("id", ParseIntPipe) id: number): Promise<ApiResponseType<any>> {
    await this.dictService.deleteItem(id);
    return { code: 0, message: "删除成功", data: null };
  }
}
