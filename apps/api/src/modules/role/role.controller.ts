import {
  Controller, Get, Post, Put, Delete,
  Body, Query, Param, UseGuards,
  ParseIntPipe, HttpCode, Inject,
} from "@nestjs/common";
import { RoleService } from "./services/role.service";
import { CreateRoleDto, UpdateRoleDto, QueryRoleDto } from "./dtos";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ApiResponse } from "@sekiro/shared";

@Controller("system/role")
@UseGuards(JwtAuthGuard)
export class RoleController {
  constructor(
    @Inject(RoleService) private readonly roleService: RoleService,
  ) {}

  @Get()
  async getPage(@Query() query: QueryRoleDto): Promise<ApiResponse<any>> {
    const data = await this.roleService.getPage(query);
    return { code: 0, message: "查询成功", data };
  }

  @Get(":id")
  async getDetail(@Param("id", ParseIntPipe) id: number): Promise<ApiResponse<any>> {
    const data = await this.roleService.getDetail(id);
    return { code: 0, message: "查询成功", data };
  }

  @Post()
  @HttpCode(200)
  async create(@Body() createDto: CreateRoleDto): Promise<ApiResponse<any>> {
    const data = await this.roleService.create(createDto);
    return { code: 0, message: "创建成功", data };
  }

  @Put(":id")
  @HttpCode(200)
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateDto: UpdateRoleDto,
  ): Promise<ApiResponse<any>> {
    const data = await this.roleService.update(id, updateDto);
    return { code: 0, message: "更新成功", data };
  }

  @Delete(":id")
  @HttpCode(200)
  async delete(@Param("id", ParseIntPipe) id: number): Promise<ApiResponse<any>> {
    await this.roleService.delete(id);
    return { code: 0, message: "删除成功", data: null };
  }

  @Put(":id/status")
  @HttpCode(200)
  async updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body("status") status: string,
  ): Promise<ApiResponse<any>> {
    const data = await this.roleService.updateStatus(id, status);
    return { code: 0, message: "状态更新成功", data };
  }

  @Put(":id/menus")
  @HttpCode(200)
  async assignMenus(
    @Param("id", ParseIntPipe) id: number,
    @Body("menuIds") menuIds: number[],
  ): Promise<ApiResponse<any>> {
    await this.roleService.assignMenus(id, menuIds);
    return { code: 0, message: "分配菜单成功", data: null };
  }

  @Put(":id/data-scope")
  @HttpCode(200)
  async setDataScope(
    @Param("id", ParseIntPipe) id: number,
    @Body("dataScope") dataScope: string,
    @Body("customDeptIds") customDeptIds: number[] = [],
  ): Promise<ApiResponse<any>> {
    await this.roleService.setDataScope(id, dataScope, customDeptIds);
    return { code: 0, message: "数据范围设置成功", data: null };
  }
}
