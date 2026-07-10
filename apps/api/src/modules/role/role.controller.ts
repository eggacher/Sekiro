import {
  Controller, Get, Post, Put, Delete,
  Body, Query, Param, UseGuards,
  ParseIntPipe, HttpCode, Inject,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { RoleService } from "./services/role.service";
import { CreateRoleDto, UpdateRoleDto, QueryRoleDto } from "./dtos";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { RequiresPermissions } from "../auth/decorators/requires-permissions.decorator";
import { ApiResponse as ApiResponseType, PERMISSIONS } from "@sekiro/shared";

@ApiTags('Role')
@Controller("system/role")
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class RoleController {
  constructor(
    @Inject(RoleService) private readonly roleService: RoleService,
  ) {}

  @Get()
  @ApiQuery({ type: QueryRoleDto })
  @ApiOperation({ summary: '分页查询角色列表' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 422, description: '参数校验失败' })
  async getPage(@Query() query: QueryRoleDto): Promise<ApiResponseType<any>> {
    const data = await this.roleService.getPage(query);
    return { code: 0, message: "查询成功", data };
  }

  @Get(":id")
  @ApiOperation({ summary: '获取角色详情' })
  @ApiResponse({ status: 200, description: '成功' })
  async getDetail(@Param("id", ParseIntPipe) id: number): Promise<ApiResponseType<any>> {
    const data = await this.roleService.getDetail(id);
    return { code: 0, message: "查询成功", data };
  }

  @RequiresPermissions(PERMISSIONS.ROLE_CREATE)
  @Post()
  @HttpCode(200)
  @ApiBody({ type: CreateRoleDto })
  @ApiOperation({ summary: '创建角色' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 422, description: '参数校验失败' })
  async create(@Body() createDto: CreateRoleDto): Promise<ApiResponseType<any>> {
    const data = await this.roleService.create(createDto);
    return { code: 0, message: "创建成功", data };
  }

  @RequiresPermissions(PERMISSIONS.ROLE_UPDATE)
  @Put(":id")
  @HttpCode(200)
  @ApiBody({ type: UpdateRoleDto })
  @ApiOperation({ summary: '更新角色' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 422, description: '参数校验失败' })
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateDto: UpdateRoleDto,
  ): Promise<ApiResponseType<any>> {
    const data = await this.roleService.update(id, updateDto);
    return { code: 0, message: "更新成功", data };
  }

  @RequiresPermissions(PERMISSIONS.ROLE_DELETE)
  @Delete(":id")
  @HttpCode(200)
  @ApiOperation({ summary: '删除角色' })
  @ApiResponse({ status: 200, description: '成功' })
  async delete(@Param("id", ParseIntPipe) id: number): Promise<ApiResponseType<any>> {
    await this.roleService.delete(id);
    return { code: 0, message: "删除成功", data: null };
  }

  @RequiresPermissions(PERMISSIONS.ROLE_UPDATE_STATUS)
  @Put(":id/status")
  @HttpCode(200)
  @ApiOperation({ summary: '更新角色状态' })
  @ApiResponse({ status: 200, description: '成功' })
  async updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body("status") status: string,
  ): Promise<ApiResponseType<any>> {
    const data = await this.roleService.updateStatus(id, status);
    return { code: 0, message: "状态更新成功", data };
  }

  @RequiresPermissions(PERMISSIONS.ROLE_ASSIGN_PERMISSION)
  @Put(":id/menus")
  @HttpCode(200)
  @ApiOperation({ summary: '分配角色菜单' })
  @ApiResponse({ status: 200, description: '成功' })
  async assignMenus(
    @Param("id", ParseIntPipe) id: number,
    @Body("menuIds") menuIds: number[],
  ): Promise<ApiResponseType<any>> {
    await this.roleService.assignMenus(id, menuIds);
    return { code: 0, message: "分配菜单成功", data: null };
  }

  @RequiresPermissions(PERMISSIONS.ROLE_DATA_SCOPE)
  @Put(":id/data-scope")
  @HttpCode(200)
  @ApiOperation({ summary: '设置角色数据范围' })
  @ApiResponse({ status: 200, description: '成功' })
  async setDataScope(
    @Param("id", ParseIntPipe) id: number,
    @Body("dataScope") dataScope: string,
    @Body("customDeptIds") customDeptIds: number[] = [],
  ): Promise<ApiResponseType<any>> {
    await this.roleService.setDataScope(id, dataScope, customDeptIds);
    return { code: 0, message: "数据范围设置成功", data: null };
  }
}
