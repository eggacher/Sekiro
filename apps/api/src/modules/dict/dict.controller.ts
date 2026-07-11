import {
  Controller, Get, Post, Put, Delete,
  Body, Query, Param, UseGuards,
  ParseIntPipe, HttpCode, Inject,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { DictService } from "./services/dict.service";
import { CreateDictDto, UpdateDictDto, QueryDictDto } from "./dtos";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { RequiresPermissions } from "../auth/decorators/requires-permissions.decorator";
import { ApiResponse as ApiResponseType, PERMISSIONS } from "@sekiro/shared";

@ApiTags('Dict')
@Controller("system/dict")
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class DictController {
  constructor(
    @Inject(DictService) private readonly dictService: DictService,
  ) {}

  @Get()
  @ApiQuery({ type: QueryDictDto })
  @ApiOperation({ summary: '分页查询字典类型' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 422, description: '参数校验失败' })
  async getPage(@Query() query: QueryDictDto): Promise<ApiResponseType<any>> {
    const data = await this.dictService.getTypePage(query);
    return { code: 0, message: "查询成功", data };
  }

  @Get(":id")
  @ApiOperation({ summary: '获取字典类型详情' })
  @ApiResponse({ status: 200, description: '成功' })
  async getDetail(@Param("id", ParseIntPipe) id: number): Promise<ApiResponseType<any>> {
    const data = await this.dictService.getTypeDetail(id);
    return { code: 0, message: "查询成功", data };
  }

  @RequiresPermissions(PERMISSIONS.DICT_CREATE)
  @Post()
  @HttpCode(200)
  @ApiBody({ type: CreateDictDto })
  @ApiOperation({ summary: '创建字典类型' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 422, description: '参数校验失败' })
  async create(@Body() createDto: CreateDictDto): Promise<ApiResponseType<any>> {
    const data = await this.dictService.createType(createDto);
    return { code: 0, message: "创建成功", data };
  }

  @RequiresPermissions(PERMISSIONS.DICT_UPDATE)
  @Put(":id")
  @HttpCode(200)
  @ApiBody({ type: UpdateDictDto })
  @ApiOperation({ summary: '更新字典类型' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 422, description: '参数校验失败' })
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateDto: UpdateDictDto,
  ): Promise<ApiResponseType<any>> {
    const data = await this.dictService.updateType(id, updateDto);
    return { code: 0, message: "更新成功", data };
  }

  @RequiresPermissions(PERMISSIONS.DICT_DELETE)
  @Delete(":id")
  @HttpCode(200)
  @ApiOperation({ summary: '删除字典类型' })
  @ApiResponse({ status: 200, description: '成功' })
  async delete(@Param("id", ParseIntPipe) id: number): Promise<ApiResponseType<any>> {
    await this.dictService.deleteType(id);
    return { code: 0, message: "删除成功", data: null };
  }

  @Get(":code/items")
  @ApiOperation({ summary: '根据字典编码获取字典项' })
  @ApiResponse({ status: 200, description: '成功' })
  async getItemsByCode(@Param("code") code: string): Promise<ApiResponseType<any>> {
    const data = await this.dictService.getActiveItemsByCode(code);
    return { code: 0, message: "查询成功", data };
  }
}
