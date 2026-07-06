import {
  Controller, Get, Post, Put, Delete,
  Body, Query, Param, UseGuards,
  ParseIntPipe, HttpCode, Inject,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiResponse } from "@nestjs/swagger";
import { MenuService } from "./services/menu.service";
import { CreateMenuDto, UpdateMenuDto } from "./dtos";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ApiResponse as ApiResponseType } from "@sekiro/shared";

@ApiTags('Menu')
@Controller("system/menu")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MenuController {
  constructor(
    @Inject(MenuService) private readonly menuService: MenuService,
  ) {}

  @Get()
  @ApiOperation({ summary: '获取菜单树' })
  @ApiResponse({ status: 200, description: '成功' })
  async getTree(@Query("status") status?: string): Promise<ApiResponseType<any>> {
    const data = await this.menuService.getTree(status);
    return { code: 0, message: "查询成功", data };
  }

  @Get(":id")
  @ApiOperation({ summary: '获取菜单详情' })
  @ApiResponse({ status: 200, description: '成功' })
  async getDetail(@Param("id", ParseIntPipe) id: number): Promise<ApiResponseType<any>> {
    const data = await this.menuService.getDetail(id);
    return { code: 0, message: "查询成功", data };
  }

  @Post()
  @HttpCode(200)
  @ApiBody({ type: CreateMenuDto })
  @ApiOperation({ summary: '创建菜单' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 422, description: '参数校验失败' })
  async create(@Body() createDto: CreateMenuDto): Promise<ApiResponseType<any>> {
    const data = await this.menuService.create(createDto);
    return { code: 0, message: "创建成功", data };
  }

  @Put(":id")
  @HttpCode(200)
  @ApiBody({ type: UpdateMenuDto })
  @ApiOperation({ summary: '更新菜单' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 422, description: '参数校验失败' })
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateDto: UpdateMenuDto,
  ): Promise<ApiResponseType<any>> {
    const data = await this.menuService.update(id, updateDto);
    return { code: 0, message: "更新成功", data };
  }

  @Delete(":id")
  @HttpCode(200)
  @ApiOperation({ summary: '删除菜单' })
  @ApiResponse({ status: 200, description: '成功' })
  async delete(@Param("id", ParseIntPipe) id: number): Promise<ApiResponseType<any>> {
    await this.menuService.delete(id);
    return { code: 0, message: "删除成功", data: null };
  }
}
