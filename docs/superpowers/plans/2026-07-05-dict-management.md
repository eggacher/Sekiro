# 数据字典管理 (Dict Management) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现数据字典和字典项的增删改查 (CRUD) 接口、级联逻辑删除和唯一性业务规则，并将前端页面 (`/system/dict`) 从 Mock 数据切换到与真实后端接口对接。

**Architecture:** 
1. 后端：基于 NestJS 控制器 (Controller) ⇄ 业务服务 (Service) ⇄ 数据库仓储层 (Repository) ⇄ Prisma ORM 模式进行开发。
2. 前端：在现有的 Next.js 页面组件中，通过 `@/lib/api/client` (apiClient) 替换 Mock 数据状态，接入真实的 CRUD 接口。

**Tech Stack:** NestJS, TypeScript, Prisma, Vitest, React, Next.js.

## Global Constraints
- 所有跨进程数据结构必须使用 `@sekiro/shared` 的类型 (`DictType`, `DictItem`)，禁止在前端和后端重复定义。
- 所有接口必须返回 `ApiResponse<T>` 统一结构。
- 数据访问必须经 ORM 参数化，防止 SQL 注入。
- 采用软删除 (`deletedAt` 字段)。删除字典类型时，级联将关联的所有字典项进行逻辑删除。
- 业务不变量：同一字典类型下字典项的 `value` 必须唯一 (INV-8)。

---

### Task 1: 字典模块 DTOs 定义与导出

**Files:**
- Create: `apps/api/src/modules/dict/dtos/create-dict.dto.ts`
- Create: `apps/api/src/modules/dict/dtos/update-dict.dto.ts`
- Create: `apps/api/src/modules/dict/dtos/query-dict.dto.ts`
- Create: `apps/api/src/modules/dict/dtos/create-dict-item.dto.ts`
- Create: `apps/api/src/modules/dict/dtos/update-dict-item.dto.ts`
- Create: `apps/api/src/modules/dict/dtos/query-dict-item.dto.ts`
- Create: `apps/api/src/modules/dict/dtos/index.ts`

**Interfaces:**
- Produces: `CreateDictDto`, `UpdateDictDto`, `QueryDictDto`, `CreateDictItemDto`, `UpdateDictItemDto`, `QueryDictItemDto` 用于控制器参数校验。

- [ ] **Step 1: 创建 `create-dict.dto.ts` 并指定校验规则**
  ```typescript
  // apps/api/src/modules/dict/dtos/create-dict.dto.ts
  import { IsString, IsOptional, Matches, Length, IsIn } from "class-validator";

  export class CreateDictDto {
    @IsString()
    @Length(1, 32)
    name!: string;

    @IsString()
    @Length(1, 64)
    @Matches(/^[a-z][a-z0-9_]*$/, { message: "字典编码必须以小写字母开头，且只能包含小写字母、数字和下划线" })
    code!: string;

    @IsOptional()
    @IsString()
    @IsIn(["enabled", "disabled"])
    status?: string;

    @IsOptional()
    @IsString()
    @Length(0, 255)
    remark?: string;
  }
  ```

- [ ] **Step 2: 创建 `update-dict.dto.ts` 并指定校验规则**
  ```typescript
  // apps/api/src/modules/dict/dtos/update-dict.dto.ts
  import { IsString, IsOptional, Length, IsIn } from "class-validator";

  export class UpdateDictDto {
    @IsString()
    @Length(1, 32)
    name!: string;

    @IsString()
    @IsIn(["enabled", "disabled"])
    status!: string;

    @IsOptional()
    @IsString()
    @Length(0, 255)
    remark?: string;
  }
  ```

- [ ] **Step 3: 创建 `query-dict.dto.ts` 并指定校验规则**
  ```typescript
  // apps/api/src/modules/dict/dtos/query-dict.dto.ts
  import { IsString, IsOptional, IsInt, Min } from "class-validator";
  import { Transform } from "class-transformer";

  export class QueryDictDto {
    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt()
    @Min(1)
    page: number = 1;

    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt()
    @Min(1)
    pageSize: number = 10;

    @IsOptional()
    @IsString()
    keyword?: string;

    @IsOptional()
    @IsString()
    status?: string;
  }
  ```

- [ ] **Step 4: 创建 `create-dict-item.dto.ts` 并指定校验规则**
  ```typescript
  // apps/api/src/modules/dict/dtos/create-dict-item.dto.ts
  import { IsString, IsInt, IsOptional, Length, Min, IsIn } from "class-validator";

  export class CreateDictItemDto {
    @IsInt()
    @Min(1)
    typeId!: number;

    @IsString()
    @Length(1, 64)
    label!: string;

    @IsString()
    @Length(1, 64)
    value!: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    sort?: number;

    @IsOptional()
    @IsString()
    @IsIn(["enabled", "disabled"])
    status?: string;
  }
  ```

- [ ] **Step 5: 创建 `update-dict-item.dto.ts` 并指定校验规则**
  ```typescript
  // apps/api/src/modules/dict/dtos/update-dict-item.dto.ts
  import { IsString, IsInt, IsIn, Length, Min } from "class-validator";

  export class UpdateDictItemDto {
    @IsString()
    @Length(1, 64)
    label!: string;

    @IsString()
    @Length(1, 64)
    value!: string;

    @IsInt()
    @Min(0)
    sort!: number;

    @IsString()
    @IsIn(["enabled", "disabled"])
    status!: string;
  }
  ```

- [ ] **Step 6: 创建 `query-dict-item.dto.ts` 并指定校验规则**
  ```typescript
  // apps/api/src/modules/dict/dtos/query-dict-item.dto.ts
  import { IsString, IsOptional, IsInt, Min } from "class-validator";
  import { Transform } from "class-transformer";

  export class QueryDictItemDto {
    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt()
    @Min(1)
    page: number = 1;

    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt()
    @Min(1)
    pageSize: number = 10;

    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt()
    typeId?: number;

    @IsOptional()
    @IsString()
    keyword?: string;

    @IsOptional()
    @IsString()
    status?: string;
  }
  ```

- [ ] **Step 7: 创建 `index.ts` 导出所有 DTOs**
  ```typescript
  // apps/api/src/modules/dict/dtos/index.ts
  export * from "./create-dict.dto";
  export * from "./update-dict.dto";
  export * from "./query-dict.dto";
  export * from "./create-dict-item.dto";
  export * from "./update-dict-item.dto";
  export * from "./query-dict-item.dto";
  ```

- [ ] **Step 8: 提交代码**
  ```bash
  git add apps/api/src/modules/dict/dtos
  git commit -m "feat(dict): add dict and dict-item validation DTOs"
  ```

---

### Task 2: 数据库仓储层 (Repositories) 编写

**Files:**
- Create: `apps/api/src/modules/dict/repositories/dict-type.repository.ts`
- Create: `apps/api/src/modules/dict/repositories/dict-item.repository.ts`

**Interfaces:**
- Consumes: `PrismaService`
- Produces: `DictTypeRepository` 和 `DictItemRepository` 数据库交互 API。

- [ ] **Step 1: 创建 `dict-type.repository.ts`**
  ```typescript
  // apps/api/src/modules/dict/repositories/dict-type.repository.ts
  import { Injectable, Inject } from "@nestjs/common";
  import { PrismaService } from "../../prisma/prisma.service";
  import { CreateDictDto, UpdateDictDto, QueryDictDto } from "../dtos";

  @Injectable()
  export class DictTypeRepository {
    constructor(
      @Inject(PrismaService) private readonly prisma: PrismaService,
    ) {}

    async findById(id: number) {
      return this.prisma.dictType.findFirst({
        where: { id, deletedAt: null },
      });
    }

    async findByCode(code: string) {
      return this.prisma.dictType.findFirst({
        where: { code, deletedAt: null },
      });
    }

    async findPage(query: QueryDictDto) {
      const where: any = { deletedAt: null };

      if (query.status) {
        where.status = query.status;
      }

      if (query.keyword) {
        where.OR = [
          { name: { contains: query.keyword } },
          { code: { contains: query.keyword } },
        ];
      }

      const page = Number(query.page) || 1;
      const pageSize = Number(query.pageSize) || 10;

      const total = await this.prisma.dictType.count({ where });
      const list = await this.prisma.dictType.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      });

      return { list, total, page, pageSize };
    }

    async create(data: CreateDictDto) {
      return this.prisma.dictType.create({
        data: {
          name: data.name,
          code: data.code,
          remark: data.remark ?? null,
          status: data.status ?? "enabled",
        },
      });
    }

    async update(id: number, data: UpdateDictDto) {
      return this.prisma.dictType.update({
        where: { id },
        data: {
          name: data.name,
          status: data.status,
          remark: data.remark ?? null,
        },
      });
    }

    async softDelete(id: number) {
      await this.prisma.$transaction(async (tx) => {
        // 级联逻辑删除字典项
        await tx.dictItem.updateMany({
          where: { typeId: id, deletedAt: null },
          data: { deletedAt: new Date() },
        });
        // 逻辑删除字典类型
        await tx.dictType.update({
          where: { id },
          data: { deletedAt: new Date() },
        });
      });
    }
  }
  ```

- [ ] **Step 2: 创建 `dict-item.repository.ts`**
  ```typescript
  // apps/api/src/modules/dict/repositories/dict-item.repository.ts
  import { Injectable, Inject } from "@nestjs/common";
  import { PrismaService } from "../../prisma/prisma.service";
  import { CreateDictItemDto, UpdateDictItemDto, QueryDictItemDto } from "../dtos";

  @Injectable()
  export class DictItemRepository {
    constructor(
      @Inject(PrismaService) private readonly prisma: PrismaService,
    ) {}

    async findById(id: number) {
      return this.prisma.dictItem.findFirst({
        where: { id, deletedAt: null },
      });
    }

    async findByValue(typeId: number, value: string) {
      return this.prisma.dictItem.findFirst({
        where: { typeId, value, deletedAt: null },
      });
    }

    async findPage(query: QueryDictItemDto) {
      const where: any = { deletedAt: null };

      if (query.typeId) {
        where.typeId = query.typeId;
      }
      if (query.status) {
        where.status = query.status;
      }
      if (query.keyword) {
        where.OR = [
          { label: { contains: query.keyword } },
          { value: { contains: query.keyword } },
        ];
      }

      const page = Number(query.page) || 1;
      const pageSize = Number(query.pageSize) || 10;

      const total = await this.prisma.dictItem.count({ where });
      const list = await this.prisma.dictItem.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { sort: "asc" },
      });

      return { list, total, page, pageSize };
    }

    async create(data: CreateDictItemDto) {
      return this.prisma.dictItem.create({
        data: {
          typeId: data.typeId,
          label: data.label,
          value: data.value,
          sort: data.sort ?? 0,
          status: data.status ?? "enabled",
        },
      });
    }

    async update(id: number, data: UpdateDictItemDto) {
      return this.prisma.dictItem.update({
        where: { id },
        data: {
          label: data.label,
          value: data.value,
          sort: data.sort,
          status: data.status,
        },
      });
    }

    async softDelete(id: number) {
      return this.prisma.dictItem.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    }

    async findActiveItemsByCode(code: string) {
      return this.prisma.dictItem.findMany({
        where: {
          deletedAt: null,
          status: "enabled",
          type: {
            code,
            deletedAt: null,
            status: "enabled",
          },
        },
        orderBy: { sort: "asc" },
      });
    }
  }
  ```

- [ ] **Step 3: 提交代码**
  ```bash
  git add apps/api/src/modules/dict/repositories
  git commit -m "feat(dict): implement DictTypeRepository and DictItemRepository"
  ```

---

### Task 3: 业务服务层 (Services) 与业务规则逻辑开发 (TDD 准备)

**Files:**
- Create: `apps/api/src/modules/dict/services/dict.service.ts`
- Create: `apps/api/src/modules/dict/__tests__/dict.service.spec.ts`

**Interfaces:**
- Consumes: `DictTypeRepository`, `DictItemRepository`
- Produces: `DictService` 类及其业务规则检测逻辑。

- [ ] **Step 1: 编写单元测试用例 `dict.service.spec.ts` (TDD 失败测试)**
  ```typescript
  // apps/api/src/modules/dict/__tests__/dict.service.spec.ts
  import { describe, it, expect, beforeEach, vi } from "vitest";
  import { DictService } from "../services/dict.service";
  import { UnprocessableEntityException, NotFoundException } from "@nestjs/common";

  describe("DictService", () => {
    let service: DictService;
    let typeRepo: any;
    let itemRepo: any;

    beforeEach(() => {
      typeRepo = {
        findById: vi.fn(),
        findByCode: vi.fn(),
        findPage: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        softDelete: vi.fn(),
      };
      itemRepo = {
        findById: vi.fn(),
        findByValue: vi.fn(),
        findPage: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        softDelete: vi.fn(),
        findActiveItemsByCode: vi.fn(),
      };
      service = new DictService(typeRepo, itemRepo);
    });

    it("创建字典类型 - code 已存在抛出 422 异常", async () => {
      typeRepo.findByCode.mockResolvedValue({ id: 1, code: "sys_user_sex" });
      await expect(
        service.createType({ name: "性别", code: "sys_user_sex" }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it("创建字典项 - 同一类型下 value 已存在 (INV-8) 抛出 422 异常", async () => {
      itemRepo.findByValue.mockResolvedValue({ id: 10, typeId: 1, value: "1" });
      await expect(
        service.createItem({ typeId: 1, label: "男", value: "1" }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it("修改字典项 - 修改后的 value 已存在于同类型中抛出异常", async () => {
      itemRepo.findById.mockResolvedValue({ id: 10, typeId: 1, value: "1" });
      itemRepo.findByValue.mockResolvedValue({ id: 11, typeId: 1, value: "2" });
      await expect(
        service.updateItem(10, { label: "女", value: "2", sort: 1, status: "enabled" }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it("修改字典项 - 字典项不存在抛出 404", async () => {
      itemRepo.findById.mockResolvedValue(null);
      await expect(
        service.updateItem(999, { label: "女", value: "2", sort: 1, status: "enabled" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("删除字典类型 - 触发级联删除", async () => {
      typeRepo.findById.mockResolvedValue({ id: 1, name: "性别" });
      typeRepo.softDelete.mockResolvedValue(undefined);
      await service.deleteType(1);
      expect(typeRepo.softDelete).toHaveBeenCalledWith(1);
    });
  });
  ```

- [ ] **Step 2: 运行测试并验证其报错失败 (TDD 失败周期)**
  运行：`pnpm --filter @sekiro/api test`
  预期结果：测试无法运行或因缺少 `dict.service.ts` 文件直接报错失败。

- [ ] **Step 3: 实现 `dict.service.ts` 业务逻辑以通过测试**
  ```typescript
  // apps/api/src/modules/dict/services/dict.service.ts
  import { Injectable, Inject, UnprocessableEntityException, NotFoundException } from "@nestjs/common";
  import { DictTypeRepository } from "../repositories/dict-type.repository";
  import { DictItemRepository } from "../repositories/dict-item.repository";
  import {
    CreateDictDto, UpdateDictDto, QueryDictDto,
    CreateDictItemDto, UpdateDictItemDto, QueryDictItemDto,
  } from "../dtos";

  @Injectable()
  export class DictService {
    constructor(
      @Inject(DictTypeRepository) private readonly typeRepo: DictTypeRepository,
      @Inject(DictItemRepository) private readonly itemRepo: DictItemRepository,
    ) {}

    // ─────────────── 字典类型业务 ───────────────

    async getTypePage(query: QueryDictDto) {
      return this.typeRepo.findPage(query);
    }

    async getTypeDetail(id: number) {
      const type = await this.typeRepo.findById(id);
      if (!type) {
        throw new NotFoundException("字典类型不存在");
      }
      return type;
    }

    async createType(data: CreateDictDto) {
      const existing = await this.typeRepo.findByCode(data.code);
      if (existing) {
        throw new UnprocessableEntityException("字典编码已存在");
      }
      return this.typeRepo.create(data);
    }

    async updateType(id: number, data: UpdateDictDto) {
      const type = await this.typeRepo.findById(id);
      if (!type) {
        throw new NotFoundException("字典类型不存在");
      }
      return this.typeRepo.update(id, data);
    }

    async deleteType(id: number) {
      const type = await this.typeRepo.findById(id);
      if (!type) {
        throw new NotFoundException("字典类型不存在");
      }
      return this.typeRepo.softDelete(id);
    }

    // ─────────────── 字典项业务 ───────────────

    async getItemPage(query: QueryDictItemDto) {
      return this.itemRepo.findPage(query);
    }

    async getItemDetail(id: number) {
      const item = await this.itemRepo.findById(id);
      if (!item) {
        throw new NotFoundException("字典项不存在");
      }
      return item;
    }

    async createItem(data: CreateDictItemDto) {
      // 检查字典类型是否存在
      const type = await this.typeRepo.findById(data.typeId);
      if (!type) {
        throw new NotFoundException("字典类型不存在");
      }
      // INV-8: 同一类型下值唯一
      const existing = await this.itemRepo.findByValue(data.typeId, data.value);
      if (existing) {
        throw new UnprocessableEntityException("当前字典类型下已存在该字典值");
      }
      return this.itemRepo.create(data);
    }

    async updateItem(id: number, data: UpdateDictItemDto) {
      const item = await this.itemRepo.findById(id);
      if (!item) {
        throw new NotFoundException("字典项不存在");
      }
      // INV-8: 同一类型下值唯一
      if (item.value !== data.value) {
        const existing = await this.itemRepo.findByValue(item.typeId, data.value);
        if (existing && existing.id !== id) {
          throw new UnprocessableEntityException("当前字典类型下已存在该字典值");
        }
      }
      return this.itemRepo.update(id, data);
    }

    async deleteItem(id: number) {
      const item = await this.itemRepo.findById(id);
      if (!item) {
        throw new NotFoundException("字典项不存在");
      }
      return this.itemRepo.softDelete(id);
    }

    async getActiveItemsByCode(code: string) {
      return this.itemRepo.findActiveItemsByCode(code);
    }
  }
  ```

- [ ] **Step 4: 重新运行单元测试验证其通过**
  运行：`pnpm --filter @sekiro/api test`
  预期结果：全量测试通过。

- [ ] **Step 5: 提交代码**
  ```bash
  git add apps/api/src/modules/dict/services apps/api/src/modules/dict/__tests__
  git commit -m "feat(dict): implement DictService and pass unit tests"
  ```

---

### Task 4: 后端控制器层 (Controllers) 与模块装配

**Files:**
- Create: `apps/api/src/modules/dict/dict.controller.ts`
- Create: `apps/api/src/modules/dict/dict-item.controller.ts`
- Create: `apps/api/src/modules/dict/dict.module.ts`
- Create: `apps/api/src/modules/dict/index.ts`
- Modify: `apps/api/src/main.ts` (集成新模块)

**Interfaces:**
- Consumes: `DictService`
- Produces: 暴露 RESTful 路由。

- [ ] **Step 1: 创建 `dict.controller.ts`**
  ```typescript
  // apps/api/src/modules/dict/dict.controller.ts
  import {
    Controller, Get, Post, Put, Delete,
    Body, Query, Param, UseGuards,
    ParseIntPipe, HttpCode, Inject,
  } from "@nestjs/common";
  import { DictService } from "./services/dict.service";
  import { CreateDictDto, UpdateDictDto, QueryDictDto } from "./dtos";
  import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
  import { ApiResponse } from "@sekiro/shared";

  @Controller("system/dict")
  @UseGuards(JwtAuthGuard)
  export class DictController {
    constructor(
      @Inject(DictService) private readonly dictService: DictService,
    ) {}

    @Get()
    async getPage(@Query() query: QueryDictDto): Promise<ApiResponse<any>> {
      const data = await this.dictService.getTypePage(query);
      return { code: 0, message: "查询成功", data };
    }

    @Get(":id")
    async getDetail(@Param("id", ParseIntPipe) id: number): Promise<ApiResponse<any>> {
      const data = await this.dictService.getTypeDetail(id);
      return { code: 0, message: "查询成功", data };
    }

    @Post()
    @HttpCode(200)
    async create(@Body() createDto: CreateDictDto): Promise<ApiResponse<any>> {
      const data = await this.dictService.createType(createDto);
      return { code: 0, message: "创建成功", data };
    }

    @Put(":id")
    @HttpCode(200)
    async update(
      @Param("id", ParseIntPipe) id: number,
      @Body() updateDto: UpdateDictDto,
    ): Promise<ApiResponse<any>> {
      const data = await this.dictService.updateType(id, updateDto);
      return { code: 0, message: "更新成功", data };
    }

    @Delete(":id")
    @HttpCode(200)
    async delete(@Param("id", ParseIntPipe) id: number): Promise<ApiResponse<any>> {
      await this.dictService.deleteType(id);
      return { code: 0, message: "删除成功", data: null };
    }

    @Get(":code/items")
    async getItemsByCode(@Param("code") code: string): Promise<ApiResponse<any>> {
      const data = await this.dictService.getActiveItemsByCode(code);
      return { code: 0, message: "查询成功", data };
    }
  }
  ```

- [ ] **Step 2: 创建 `dict-item.controller.ts`**
  ```typescript
  // apps/api/src/modules/dict/dict-item.controller.ts
  import {
    Controller, Get, Post, Put, Delete,
    Body, Query, Param, UseGuards,
    ParseIntPipe, HttpCode, Inject,
  } from "@nestjs/common";
  import { DictService } from "./services/dict.service";
  import { CreateDictItemDto, UpdateDictItemDto, QueryDictItemDto } from "./dtos";
  import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
  import { ApiResponse } from "@sekiro/shared";

  @Controller("system/dict-item")
  @UseGuards(JwtAuthGuard)
  export class DictItemController {
    constructor(
      @Inject(DictService) private readonly dictService: DictService,
    ) {}

    @Get()
    async getPage(@Query() query: QueryDictItemDto): Promise<ApiResponse<any>> {
      const data = await this.dictService.getItemPage(query);
      return { code: 0, message: "查询成功", data };
    }

    @Get(":id")
    async getDetail(@Param("id", ParseIntPipe) id: number): Promise<ApiResponse<any>> {
      const data = await this.dictService.getItemDetail(id);
      return { code: 0, message: "查询成功", data };
    }

    @Post()
    @HttpCode(200)
    async create(@Body() createDto: CreateDictItemDto): Promise<ApiResponse<any>> {
      const data = await this.dictService.createItem(createDto);
      return { code: 0, message: "创建成功", data };
    }

    @Put(":id")
    @HttpCode(200)
    async update(
      @Param("id", ParseIntPipe) id: number,
      @Body() updateDto: UpdateDictItemDto,
    ): Promise<ApiResponse<any>> {
      const data = await this.dictService.updateItem(id, updateDto);
      return { code: 0, message: "更新成功", data };
    }

    @Delete(":id")
    @HttpCode(200)
    async delete(@Param("id", ParseIntPipe) id: number): Promise<ApiResponse<any>> {
      await this.dictService.deleteItem(id);
      return { code: 0, message: "删除成功", data: null };
    }
  }
  ```

- [ ] **Step 3: 创建 `dict.module.ts` 并装配依赖**
  ```typescript
  // apps/api/src/modules/dict/dict.module.ts
  import { Module } from "@nestjs/common";
  import { DictController } from "./dict.controller";
  import { DictItemController } from "./dict-item.controller";
  import { DictService } from "./services/dict.service";
  import { DictTypeRepository } from "./repositories/dict-type.repository";
  import { DictItemRepository } from "./repositories/dict-item.repository";

  @Module({
    controllers: [DictController, DictItemController],
    providers: [DictService, DictTypeRepository, DictItemRepository],
    exports: [DictService],
  })
  export class DictModule {}
  ```

- [ ] **Step 4: 创建 `index.ts` 导出模块**
  ```typescript
  // apps/api/src/modules/dict/index.ts
  export * from "./dict.module";
  export * from "./services/dict.service";
  ```

- [ ] **Step 5: 修改 `apps/api/src/main.ts` 以注册 `DictModule`**
  ```typescript
  // apps/api/src/main.ts
  // 查找 imports 数组并在其中添加 DictModule:
  import { DictModule } from "./modules/dict";
  ```
  *(注：将其追加到 imports: `[..., DeptModule, DictModule]`)*

- [ ] **Step 6: 检查后端构建状态与全局测试**
  运行：`pnpm --filter @sekiro/api typecheck && pnpm --filter @sekiro/api test`
  预期结果：编译通过且全部测试绿色通过。

- [ ] **Step 7: 提交代码**
  ```bash
  git add apps/api/src/modules/dict/dict.controller.ts apps/api/src/modules/dict/dict-item.controller.ts apps/api/src/modules/dict/dict.module.ts apps/api/src/modules/dict/index.ts apps/api/src/main.ts
  git commit -m "feat(dict): implement Controllers and register DictModule"
  ```

---

### Task 5: 前端字典页面对接真实 API 接口

**Files:**
- Modify: `apps/web/app/(dashboard)/system/dict/page.tsx`

**Interfaces:**
- Consumes: `@/lib/api/client` (apiClient), `@sekiro/shared` (`DictType`, `DictItem`, `PageResult`)

- [ ] **Step 1: 修改页面引入真实 API 客户端与类型定义**
  将 `page.tsx` 中的本地 mock 引入替换为以下真实类型和 API 库：
  ```typescript
  import { apiClient } from "@/lib/api/client";
  import type { DictType, DictItem, PageResult } from "@sekiro/shared";
  ```

- [ ] **Step 2: 重构 `DictPage` 组件的状态定义与生命周期加载**
  在页面中使用 React 状态管理，并使用 `useEffect` 在组件挂载及 `activeId` 发生变更时向后台发起请求加载数据。

  *修改细节*:
  ```typescript
  export default function DictPage() {
    const [dicts, setDicts] = React.useState<DictType[]>([]);
    const [activeId, setActiveId] = React.useState<number | null>(null);
    const [items, setItems] = React.useState<DictItem[]>([]);
    const [kw, setKw] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [itemsLoading, setItemsLoading] = React.useState(false);

    // 弹窗状态保持原有...
    
    // 获取字典类型列表
    const fetchTypes = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get<PageResult<DictType>>("/system/dict?page=1&pageSize=1000");
        setDicts(res.list);
        if (res.list.length > 0 && activeId === null) {
          setActiveId(res.list[0].id);
        }
      } catch (err: any) {
        toast.error(err.message || "加载字典类型失败");
      } finally {
        setLoading(false);
      }
    };

    // 获取特定类型的字典项
    const fetchItems = async (typeId: number) => {
      try {
        setItemsLoading(true);
        const res = await apiClient.get<PageResult<DictItem>>(`/system/dict-item?typeId=${typeId}&page=1&pageSize=1000`);
        setItems(res.list);
      } catch (err: any) {
        toast.error(err.message || "加载字典项失败");
      } finally {
        setItemsLoading(false);
      }
    };

    React.useEffect(() => {
      fetchTypes();
    }, []);

    React.useEffect(() => {
      if (activeId !== null) {
        fetchItems(activeId);
      } else {
        setItems([]);
      }
    }, [activeId]);
  ```

- [ ] **Step 3: 重新对接增、删、改业务交互逻辑**
  重写 DTO 的保存方法，将原有的客户端 `setDicts` 替换为向后端发起接口请求：
  * 保存字典类型 `saveType` (调用 `POST /system/dict` 或 `PUT /system/dict/:id`)。
  * 删除字典类型 `deleteType` (调用 `DELETE /system/dict/:id`)。
  * 保存字典项 `saveItem` (调用 `POST /system/dict-item` 或 `PUT /system/dict-item/:id`)。
  * 删除字典项 `deleteItem` (调用 `DELETE /system/dict-item/:id`)。

  *逻辑代码实现细节*:
  ```typescript
    const saveType = async (data: Partial<DictType>) => {
      try {
        if (editingType) {
          await apiClient.put(`/system/dict/${editingType.id}`, {
            name: data.name,
            status: data.status,
            remark: data.remark,
          });
          toast.success("字典类型更新成功");
        } else {
          const res = await apiClient.post<DictType>("/system/dict", {
            name: data.name,
            code: data.code,
            status: data.status,
            remark: data.remark,
          });
          setActiveId(res.id);
          toast.success("字典类型新增成功");
        }
        setTypeFormOpen(false);
        setEditingType(null);
        await fetchTypes();
      } catch (err: any) {
        toast.error(err.message || "保存字典类型失败");
      }
    };

    const deleteType = async () => {
      if (!delType) return;
      try {
        await apiClient.delete(`/system/dict/${delType}`);
        toast.success("已删除字典类型");
        setDelType(null);
        // 如果删除的是当前选中的字典，且还有其他字典，重新选择第一个
        const remaining = dicts.filter(d => d.id !== delType);
        if (activeId === delType) {
          setActiveId(remaining.length > 0 ? remaining[0].id : null);
        }
        await fetchTypes();
      } catch (err: any) {
        toast.error(err.message || "删除字典类型失败");
      }
    };

    const saveItem = async (data: Partial<DictItem>) => {
      if (activeId === null) return;
      try {
        if (editingItem) {
          await apiClient.put(`/system/dict-item/${editingItem.id}`, {
            label: data.label,
            value: data.value,
            sort: data.sort,
            status: data.status,
          });
          toast.success("字典项更新成功");
        } else {
          await apiClient.post("/system/dict-item", {
            typeId: activeId,
            label: data.label,
            value: data.value,
            sort: data.sort,
            status: data.status,
          });
          toast.success("字典项新增成功");
        }
        setItemFormOpen(false);
        setEditingItem(null);
        await fetchItems(activeId);
      } catch (err: any) {
        toast.error(err.message || "保存字典项失败");
      }
    };

    const deleteItem = async () => {
      // 在原代码中是通过 delItemValue 删除，重写时改为直接传递待删除的 DictItem.id
      if (!delItemValue) return; // 对应弹窗中的 delItemValue
      const itemToDelete = items.find(it => it.value === delItemValue);
      if (!itemToDelete) return;
      try {
        await apiClient.delete(`/system/dict-item/${itemToDelete.id}`);
        toast.success("已删除字典项");
        setDelItemValue(null);
        if (activeId !== null) {
          await fetchItems(activeId);
        }
      } catch (err: any) {
        toast.error(err.message || "删除字典项失败");
      }
    };
  ```

- [ ] **Step 4: 测试前端与后端联调编译**
  运行：`pnpm --filter @sekiro/web build`
  预期结果：前端项目顺利编译通过且无 TS 类型报错。

- [ ] **Step 5: 提交代码**
  ```bash
  git add apps/web/app/\(dashboard\)/system/dict/page.tsx
  git commit -m "feat(dict): connect frontend dictionary management to real APIs"
  ```

---

## Verification Plan

### Automated Tests
1. 运行后端所有单元测试：
   `pnpm --filter @sekiro/api test`
2. 进行项目编译与类型检查：
   `pnpm -r typecheck`

### Manual Verification
1. 启动本地前后端服务：
   * 启动 API 开发服务器：`pnpm dev:api`
   * 启动 Web 前端服务：`pnpm dev:web`
2. 打开浏览器登录系统，进入“系统管理” ⇄ “数据字典”。
3. 验证功能正常：
   * 查看左侧字典类型列表及对应的字典项。
   * 新增一个字典类型（例如：`sys_test_dict`），确保新增成功且不能同名。
   * 为 `sys_test_dict` 新增若干字典项，确保排序、标签、值展示正确，且在同字典类型下输入重复的“字典值”时触发 422 拦截错误。
   * 逻辑删除一个字典项，检查它在页面上消失。
   * 逻辑删除 `sys_test_dict`，验证其在左侧列表消失。
