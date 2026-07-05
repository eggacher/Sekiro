import {
  Controller, Get, Post, Put, Delete,
  Body, Query, Param, UseGuards,
  ParseIntPipe, HttpCode, Inject,
} from "@nestjs/common";
import { DeptService } from "./services/dept.service";
import { CreateDeptDto, UpdateDeptDto, QueryDeptDto } from "./dtos";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ApiResponse } from "@sekiro/shared";

import { UseInterceptors } from "@nestjs/common";
import { DataScopeInterceptor } from "../auth/interceptors/data-scope.interceptor";
import { UserScope } from "../auth/decorators/user-scope.decorator";
import { UserDataScope } from "../auth/types";

@Controller("system/dept")
@UseGuards(JwtAuthGuard)
export class DeptController {
  constructor(
    @Inject(DeptService) private readonly deptService: DeptService,
  ) {}

  @Get()
  @UseInterceptors(DataScopeInterceptor)
  async getTree(
    @Query() query: QueryDeptDto,
    @UserScope() scope: UserDataScope,
  ): Promise<ApiResponse<any>> {
    const data = await this.deptService.getTree(query, scope);
    return { code: 0, message: "查询成功", data };
  }

  @Get(":id")
  async getDetail(@Param("id", ParseIntPipe) id: number): Promise<ApiResponse<any>> {
    const data = await this.deptService.getDetail(id);
    return { code: 0, message: "查询成功", data };
  }

  @Post()
  @HttpCode(200)
  async create(@Body() createDto: CreateDeptDto): Promise<ApiResponse<any>> {
    const data = await this.deptService.create(createDto);
    return { code: 0, message: "创建成功", data };
  }

  @Put(":id")
  @HttpCode(200)
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateDto: UpdateDeptDto,
  ): Promise<ApiResponse<any>> {
    const data = await this.deptService.update(id, updateDto);
    return { code: 0, message: "更新成功", data };
  }

  @Delete(":id")
  @HttpCode(200)
  async delete(@Param("id", ParseIntPipe) id: number): Promise<ApiResponse<any>> {
    await this.deptService.delete(id);
    return { code: 0, message: "删除成功", data: null };
  }
}
