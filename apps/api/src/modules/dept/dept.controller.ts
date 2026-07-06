import {
  Controller, Get, Post, Put, Delete,
  Body, Query, Param, UseGuards,
  ParseIntPipe, HttpCode, Inject,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { DeptService } from "./services/dept.service";
import { CreateDeptDto, UpdateDeptDto, QueryDeptDto } from "./dtos";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ApiResponse as ApiResponseType } from "@sekiro/shared";

import { UseInterceptors } from "@nestjs/common";
import { DataScopeInterceptor } from "../auth/interceptors/data-scope.interceptor";
import { UserScope } from "../auth/decorators/user-scope.decorator";
import { UserDataScope } from "../auth/types";

@ApiTags('Dept')
@Controller("system/dept")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DeptController {
  constructor(
    @Inject(DeptService) private readonly deptService: DeptService,
  ) {}

  @Get()
  @UseInterceptors(DataScopeInterceptor)
  @ApiQuery({ type: QueryDeptDto })
  @ApiOperation({ summary: '获取部门树' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 422, description: '参数校验失败' })
  async getTree(
    @Query() query: QueryDeptDto,
    @UserScope() scope: UserDataScope,
  ): Promise<ApiResponseType<any>> {
    const data = await this.deptService.getTree(query, scope);
    return { code: 0, message: "查询成功", data };
  }

  @Get(":id")
  @ApiOperation({ summary: '获取部门详情' })
  @ApiResponse({ status: 200, description: '成功' })
  async getDetail(@Param("id", ParseIntPipe) id: number): Promise<ApiResponseType<any>> {
    const data = await this.deptService.getDetail(id);
    return { code: 0, message: "查询成功", data };
  }

  @Post()
  @HttpCode(200)
  @ApiBody({ type: CreateDeptDto })
  @ApiOperation({ summary: '创建部门' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 422, description: '参数校验失败' })
  async create(@Body() createDto: CreateDeptDto): Promise<ApiResponseType<any>> {
    const data = await this.deptService.create(createDto);
    return { code: 0, message: "创建成功", data };
  }

  @Put(":id")
  @HttpCode(200)
  @ApiBody({ type: UpdateDeptDto })
  @ApiOperation({ summary: '更新部门' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 422, description: '参数校验失败' })
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateDto: UpdateDeptDto,
  ): Promise<ApiResponseType<any>> {
    const data = await this.deptService.update(id, updateDto);
    return { code: 0, message: "更新成功", data };
  }

  @Delete(":id")
  @HttpCode(200)
  @ApiOperation({ summary: '删除部门' })
  @ApiResponse({ status: 200, description: '成功' })
  async delete(@Param("id", ParseIntPipe) id: number): Promise<ApiResponseType<any>> {
    await this.deptService.delete(id);
    return { code: 0, message: "删除成功", data: null };
  }
}
