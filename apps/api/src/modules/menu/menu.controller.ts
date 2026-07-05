import {
  Controller, Get, Post, Put, Delete,
  Body, Query, Param, UseGuards,
  ParseIntPipe, HttpCode, Inject,
} from "@nestjs/common";
import { MenuService } from "./services/menu.service";
import { CreateMenuDto, UpdateMenuDto } from "./dtos";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ApiResponse } from "@sekiro/shared";

@Controller("system/menu")
@UseGuards(JwtAuthGuard)
export class MenuController {
  constructor(
    @Inject(MenuService) private readonly menuService: MenuService,
  ) {}

  @Get()
  async getTree(@Query("status") status?: string): Promise<ApiResponse<any>> {
    const data = await this.menuService.getTree(status);
    return { code: 0, message: "查询成功", data };
  }

  @Get(":id")
  async getDetail(@Param("id", ParseIntPipe) id: number): Promise<ApiResponse<any>> {
    const data = await this.menuService.getDetail(id);
    return { code: 0, message: "查询成功", data };
  }

  @Post()
  @HttpCode(200)
  async create(@Body() createDto: CreateMenuDto): Promise<ApiResponse<any>> {
    const data = await this.menuService.create(createDto);
    return { code: 0, message: "创建成功", data };
  }

  @Put(":id")
  @HttpCode(200)
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateDto: UpdateMenuDto,
  ): Promise<ApiResponse<any>> {
    const data = await this.menuService.update(id, updateDto);
    return { code: 0, message: "更新成功", data };
  }

  @Delete(":id")
  @HttpCode(200)
  async delete(@Param("id", ParseIntPipe) id: number): Promise<ApiResponse<any>> {
    await this.menuService.delete(id);
    return { code: 0, message: "删除成功", data: null };
  }
}
