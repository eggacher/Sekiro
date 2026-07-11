import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  Param,
  Req,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  Inject,
  UseInterceptors,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { UserService } from "./services/user.service";
import { CreateUserDto, UpdateUserDto, UpdatePasswordDto, QueryUserDto } from "./dtos";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionGuard } from "../auth/guards/permission.guard";
import { RequiresPermissions } from "../auth/decorators/requires-permissions.decorator";
import { CommonStatus, ApiResponse as ApiResponseType, PERMISSIONS } from "@sekiro/shared";
import { DataScopeInterceptor } from "../auth/interceptors/data-scope.interceptor";
import { UserScope } from "../auth/decorators/user-scope.decorator";
import { UserDataScope } from "../auth/types";

@ApiTags('User')
@Controller("system/user")
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class UserController {
  constructor(
    @Inject(UserService) private readonly userService: UserService,
  ) {}

  @Get()
  @UseInterceptors(DataScopeInterceptor)
  @ApiQuery({ type: QueryUserDto })
  @ApiOperation({ summary: '分页查询用户列表' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 422, description: '参数校验失败' })
  async getPage(
    @Query() query: QueryUserDto,
    @UserScope() scope: UserDataScope,
  ): Promise<ApiResponseType<any>> {
    const data = await this.userService.getPage(query, scope);
    return { code: 0, message: "查询成功", data };
  }

  @Get(":id")
  @ApiOperation({ summary: '获取用户详情' })
  @ApiResponse({ status: 200, description: '成功' })
  async getDetail(@Param("id", ParseIntPipe) id: number): Promise<ApiResponseType<any>> {
    const data = await this.userService.getDetail(id);
    return { code: 0, message: "查询成功", data };
  }

  @Put("profile")
  @HttpCode(200)
  @ApiBody({ type: UpdateUserDto })
  @ApiOperation({ summary: '更新当前用户资料' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 422, description: '参数校验失败' })
  async updateProfile(
    @Body() updateDto: UpdateUserDto,
    @Req() req: any,
  ): Promise<ApiResponseType<any>> {
    const data = await this.userService.updateProfile(req.user.sub, updateDto);
    return { code: 0, message: "资料更新成功", data };
  }

  @Put("password")
  @HttpCode(200)
  @ApiBody({ type: UpdatePasswordDto })
  @ApiOperation({ summary: '修改当前用户密码' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 422, description: '参数校验失败' })
  async changePassword(
    @Body() passwordDto: UpdatePasswordDto,
    @Req() req: any,
  ): Promise<ApiResponseType<any>> {
    await this.userService.changePassword(
      req.user.sub,
      passwordDto.oldPassword,
      passwordDto.newPassword,
    );
    return { code: 0, message: "密码修改成功", data: null };
  }

  @RequiresPermissions(PERMISSIONS.USER_CREATE)
  @Post()
  @HttpCode(200)
  @ApiBody({ type: CreateUserDto })
  @ApiOperation({ summary: '创建用户' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 422, description: '参数校验失败' })
  async create(@Body() createDto: CreateUserDto): Promise<ApiResponseType<any>> {
    const data = await this.userService.create(createDto);
    return { code: 0, message: "创建成功", data };
  }

  @RequiresPermissions(PERMISSIONS.USER_UPDATE)
  @Put(":id")
  @HttpCode(200)
  @ApiBody({ type: UpdateUserDto })
  @ApiOperation({ summary: '更新用户' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 422, description: '参数校验失败' })
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateDto: UpdateUserDto,
  ): Promise<ApiResponseType<any>> {
    const data = await this.userService.update(id, updateDto);
    return { code: 0, message: "更新成功", data };
  }

  @RequiresPermissions(PERMISSIONS.USER_DELETE)
  @Delete(":id")
  @HttpCode(200)
  @ApiOperation({ summary: '删除用户' })
  @ApiResponse({ status: 200, description: '成功' })
  async delete(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: any,
  ): Promise<ApiResponseType<any>> {
    await this.userService.delete(id, req.user);
    return { code: 0, message: "删除成功", data: null };
  }

  @RequiresPermissions(PERMISSIONS.USER_UPDATE_STATUS)
  @Put(":id/status")
  @HttpCode(200)
  @ApiOperation({ summary: '更新用户状态' })
  @ApiResponse({ status: 200, description: '成功' })
  async updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body("status") status: string,
  ): Promise<ApiResponseType<any>> {
    const data = await this.userService.updateStatus(id, status);
    return { code: 0, message: "状态更新成功", data };
  }

  @RequiresPermissions(PERMISSIONS.USER_RESET)
  @Put(":id/reset-password")
  @HttpCode(200)
  @ApiOperation({ summary: '重置用户密码' })
  @ApiResponse({ status: 200, description: '成功' })
  async resetPassword(@Param("id", ParseIntPipe) id: number): Promise<ApiResponseType<any>> {
    await this.userService.resetPassword(id);
    return { code: 0, message: "密码重置成功", data: null };
  }

  @RequiresPermissions(PERMISSIONS.USER_ASSIGN_ROLE)
  @Put(":id/roles")
  @HttpCode(200)
  @ApiOperation({ summary: '分配用户角色' })
  @ApiResponse({ status: 200, description: '成功' })
  async assignRoles(
    @Param("id", ParseIntPipe) id: number,
    @Body("roleIds") roleIds: number[],
  ): Promise<ApiResponseType<any>> {
    await this.userService.assignRoles(id, roleIds);
    return { code: 0, message: "分配角色成功", data: null };
  }

  @RequiresPermissions(PERMISSIONS.USER_ASSIGN_POSITION)
  @Put(":id/positions")
  @HttpCode(200)
  @ApiOperation({ summary: '分配用户岗位' })
  @ApiResponse({ status: 200, description: '成功' })
  async assignPositions(
    @Param("id", ParseIntPipe) id: number,
    @Body("positionIds") positionIds: number[],
  ): Promise<ApiResponseType<any>> {
    await this.userService.assignPositions(id, positionIds);
    return { code: 0, message: "分配岗位成功", data: null };
  }
}
