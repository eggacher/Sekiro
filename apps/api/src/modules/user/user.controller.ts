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
import { UserService } from "./services/user.service";
import { CreateUserDto, UpdateUserDto, UpdatePasswordDto, QueryUserDto } from "./dtos";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CommonStatus, ApiResponse } from "@sekiro/shared";
import { DataScopeInterceptor } from "../auth/interceptors/data-scope.interceptor";
import { UserScope } from "../auth/decorators/user-scope.decorator";
import { UserDataScope } from "../auth/types";

@Controller("system/user")
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(
    @Inject(UserService) private readonly userService: UserService,
  ) {}

  @Get()
  @UseInterceptors(DataScopeInterceptor)
  async getPage(
    @Query() query: QueryUserDto,
    @UserScope() scope: UserDataScope,
  ): Promise<ApiResponse<any>> {
    const data = await this.userService.getPage(query, scope);
    return { code: 0, message: "查询成功", data };
  }

  @Get(":id")
  async getDetail(@Param("id", ParseIntPipe) id: number): Promise<ApiResponse<any>> {
    const data = await this.userService.getDetail(id);
    return { code: 0, message: "查询成功", data };
  }

  @Put("profile")
  @HttpCode(200)
  async updateProfile(
    @Body() updateDto: UpdateUserDto,
    @Req() req: any,
  ): Promise<ApiResponse<any>> {
    const data = await this.userService.updateProfile(req.user.sub, updateDto);
    return { code: 0, message: "资料更新成功", data };
  }

  @Put("password")
  @HttpCode(200)
  async changePassword(
    @Body() passwordDto: UpdatePasswordDto,
    @Req() req: any,
  ): Promise<ApiResponse<any>> {
    await this.userService.changePassword(
      req.user.sub,
      passwordDto.oldPassword,
      passwordDto.newPassword,
    );
    return { code: 0, message: "密码修改成功", data: null };
  }

  @Post()
  @HttpCode(200)
  async create(@Body() createDto: CreateUserDto): Promise<ApiResponse<any>> {
    const data = await this.userService.create(createDto);
    return { code: 0, message: "创建成功", data };
  }

  @Put(":id")
  @HttpCode(200)
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateDto: UpdateUserDto,
  ): Promise<ApiResponse<any>> {
    const data = await this.userService.update(id, updateDto);
    return { code: 0, message: "更新成功", data };
  }

  @Delete(":id")
  @HttpCode(200)
  async delete(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: any,
  ): Promise<ApiResponse<any>> {
    await this.userService.delete(id, req.user);
    return { code: 0, message: "删除成功", data: null };
  }

  @Put(":id/status")
  @HttpCode(200)
  async updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body("status") status: string,
  ): Promise<ApiResponse<any>> {
    const data = await this.userService.updateStatus(id, status);
    return { code: 0, message: "状态更新成功", data };
  }

  @Put(":id/reset-password")
  @HttpCode(200)
  async resetPassword(@Param("id", ParseIntPipe) id: number): Promise<ApiResponse<any>> {
    await this.userService.resetPassword(id);
    return { code: 0, message: "密码重置成功", data: null };
  }

  @Put(":id/roles")
  @HttpCode(200)
  async assignRoles(
    @Param("id", ParseIntPipe) id: number,
    @Body("roleIds") roleIds: number[],
  ): Promise<ApiResponse<any>> {
    await this.userService.assignRoles(id, roleIds);
    return { code: 0, message: "分配角色成功", data: null };
  }

  @Put(":id/positions")
  @HttpCode(200)
  async assignPositions(
    @Param("id", ParseIntPipe) id: number,
    @Body("positionIds") positionIds: number[],
  ): Promise<ApiResponse<any>> {
    await this.userService.assignPositions(id, positionIds);
    return { code: 0, message: "分配岗位成功", data: null };
  }
}
