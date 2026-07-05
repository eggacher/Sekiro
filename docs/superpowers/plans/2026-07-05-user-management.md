# User Management 用户管理模块实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 Sekiro 后端完整的用户管理模块，包含分页过滤（带数据权限过滤）、基础 CRUD 行为、系统级超管与删除自我防御、密码重置及独立的岗位与角色绑定。

**Architecture:** 标准 NestJS 领域分层结构（`UserController` ➡️ `UserService` ➡️ `UserRepository`），并在 `UserService` 统一守护不变量与安全规则。

**Tech Stack:**
- NestJS 11.x
- Prisma 7.x (with pg adapter)
- bcrypt 6.x
- class-validator / class-transformer

## Global Constraints
- 所有 HTTP 响应必须符合统一格式：`ApiResponse<T>`，错误状态码也必须在 200 状态下以 `code` 区分。
- 创建用户及重置密码时密码一律默认为：`sekiro123`，由 Bcrypt (cost=10) 哈希。
- 新增和编辑 Payload 必须是纯粹的基础信息，严禁包含 `roleIds` 和 `positionIds`。
- 超级管理员（ID = 1）禁止被删除，且禁止被停用。
- 登录用户禁止删除自己。
- 数据访问必须经 `PrismaService` 并且使用参数化查询。
- 时间字段使用 ISO 8601 UTC 格式。

---

## Task Decomposition

### Task 1: 类型与 DTO 定义

**Files:**
- Create: `apps/api/src/modules/user/dtos/create-user.dto.ts`
- Create: `apps/api/src/modules/user/dtos/update-user.dto.ts`
- Create: `apps/api/src/modules/user/dtos/query-user.dto.ts`
- Create: `apps/api/src/modules/user/dtos/index.ts`

**Interfaces:**
- Produces: `CreateUserDto` class for validation.
- Produces: `UpdateUserDto` class for validation.
- Produces: `QueryUserDto` class for validation.

- [ ] **Step 1.1: 创建 CreateUserDto**
  在 `apps/api/src/modules/user/dtos/create-user.dto.ts` 写入：
  ```typescript
  import { IsString, IsOptional, IsEmail, Matches, Length } from "class-validator";

  export class CreateUserDto {
    @IsString({ message: "用户名必须是字符串" })
    @Length(3, 32, { message: "用户名必须 3-32 位" })
    @Matches(/^[a-zA-Z0-9_]+$/, { message: "用户名只能包含字母、数字和下划线" })
    username!: string;

    @IsString({ message: "显示名必须是字符串" })
    @Length(1, 32, { message: "显示名长度必须 1-32 位" })
    nickname!: string;

    @IsOptional()
    @IsEmail({}, { message: "邮箱格式不正确" })
    email?: string;

    @IsOptional()
    @Matches(/^\d{11}$/, { message: "手机号必须是 11 位数字" })
    phone?: string;

    @IsOptional()
    @IsString()
    avatar?: string;

    @IsOptional()
    deptId?: number;
  }
  ```

- [ ] **Step 1.2: 创建 UpdateUserDto**
  在 `apps/api/src/modules/user/dtos/update-user.dto.ts` 写入：
  ```typescript
  import { IsString, IsOptional, IsEmail, Matches, Length } from "class-validator";

  export class UpdateUserDto {
    @IsString({ message: "显示名必须是字符串" })
    @Length(1, 32, { message: "显示名长度必须 1-32 位" })
    nickname!: string;

    @IsOptional()
    @IsEmail({}, { message: "邮箱格式不正确" })
    email?: string;

    @IsOptional()
    @Matches(/^\d{11}$/, { message: "手机号必须是 11 位数字" })
    phone?: string;

    @IsOptional()
    @IsString()
    avatar?: string;

    @IsOptional()
    deptId?: number;
  }
  ```

- [ ] **Step 1.3: 创建 QueryUserDto**
  在 `apps/api/src/modules/user/dtos/query-user.dto.ts` 写入：
  ```typescript
  import { IsString, IsOptional, IsInt, Min } from "class-validator";
  import { Transform } from "class-transformer";

  export class QueryUserDto {
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
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt()
    deptId?: number;

    @IsOptional()
    @IsString()
    status?: string;
  }
  ```

- [ ] **Step 1.4: 统一重导出**
  在 `apps/api/src/modules/user/dtos/index.ts` 写入：
  ```typescript
  export * from "./create-user.dto";
  export * from "./update-user.dto";
  export * from "./query-user.dto";
  ```

- [ ] **Step 1.5: 验证编译**
  运行：`pnpm --filter @sekiro/api typecheck`
  预期：编译成功，无错误。

- [ ] **Step 1.6: Commit**
  运行：`git add apps/api/src/modules/user/dtos/ && git commit -m "feat(user): add user module query/create/update DTOs"`

---

### Task 2: UserRepository 基础数据层实现

**Files:**
- Create: `apps/api/src/modules/user/repositories/user.repository.ts`

**Interfaces:**
- Consumes: `PrismaService`
- Produces: `UserRepository` methods (`findPage`, `findById`, `findByUsername`, `create`, `update`, `softDelete`, `updateStatus`, `updatePassword`)

- [ ] **Step 2.1: 编写 UserRepository 框架**
  在 `apps/api/src/modules/user/repositories/user.repository.ts` 写入：
  ```typescript
  import { Injectable, Inject } from "@nestjs/common";
  import { PrismaService } from "../../prisma/prisma.service";
  import { CreateUserDto, UpdateUserDto, QueryUserDto } from "../dtos";
  import { CommonStatus } from "@sekiro/shared";

  @Injectable()
  export class UserRepository {
    constructor(
      @Inject(PrismaService) private readonly prisma: PrismaService,
    ) {}

    async findById(id: number) {
      return this.prisma.user.findFirst({
        where: { id, deletedAt: null },
      });
    }

    async findByUsername(username: string) {
      return this.prisma.user.findFirst({
        where: { username, deletedAt: null },
      });
    }

    async create(data: CreateUserDto, passwordHash: string) {
      return this.prisma.user.create({
        data: {
          username: data.username,
          nickname: data.nickname,
          email: data.email,
          phone: data.phone,
          avatar: data.avatar,
          deptId: data.deptId,
          passwordHash,
        },
      });
    }

    async update(id: number, data: UpdateUserDto) {
      return this.prisma.user.update({
        where: { id },
        data: {
          nickname: data.nickname,
          email: data.email,
          phone: data.phone,
          avatar: data.avatar,
          deptId: data.deptId,
        },
      });
    }

    async softDelete(id: number) {
      return this.prisma.user.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    }

    async updateStatus(id: number, status: string) {
      return this.prisma.user.update({
        where: { id },
        data: { status },
      });
    }

    async updatePassword(id: number, passwordHash: string) {
      return this.prisma.user.update({
        where: { id },
        data: { passwordHash },
      });
    }

    async findPage(query: QueryUserDto, deptIdsScope: number[] | null) {
      const where: any = { deletedAt: null };

      if (query.status) {
        where.status = query.status;
      }

      if (query.keyword) {
        where.OR = [
          { username: { contains: query.keyword } },
          { nickname: { contains: query.keyword } },
        ];
      }

      if (query.deptId) {
        where.deptId = query.deptId;
      } else if (deptIdsScope !== null) {
        where.deptId = { in: deptIdsScope };
      }

      const total = await this.prisma.user.count({ where });
      const list = await this.prisma.user.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { createdAt: "desc" },
      });

      return {
        list,
        total,
        page: query.page,
        pageSize: query.pageSize,
      };
    }
  }
  ```

- [ ] **Step 2.2: 验证编译**
  运行：`pnpm --filter @sekiro/api typecheck`
  预期：无 TypeScript 编译错误。

- [ ] **Step 2.3: Commit**
  运行：`git add apps/api/src/modules/user/repositories/user.repository.ts && git commit -m "feat(user): implement UserRepository with basic db CRUD query"`

---

### Task 3: UserService 业务逻辑与守卫规则

**Files:**
- Create: `apps/api/src/modules/user/services/user.service.ts`
- Create: `apps/api/src/modules/user/__tests__/user.service.spec.ts`

**Interfaces:**
- Consumes: `UserRepository`
- Produces: `UserService` methods with safety guards.

- [ ] **Step 3.1: 编写 UserService 单元测试（TDD 驱动）**
  在 `apps/api/src/modules/user/__tests__/user.service.spec.ts` 写入：
  ```typescript
  import { describe, it, expect, beforeEach, vi } from "vitest";
  import { UserService } from "../services/user.service";
  import { ForbiddenException, UnprocessableEntityException, NotFoundException } from "@nestjs/common";

  describe("UserService", () => {
    let service: UserService;
    let repository: any;

    beforeEach(() => {
      repository = {
        findById: vi.fn(),
        findByUsername: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        softDelete: vi.fn(),
        updateStatus: vi.fn(),
        updatePassword: vi.fn(),
        findPage: vi.fn(),
      };
      service = new UserService(repository);
    });

    it("新建用户 - 用户名已存在抛出异常", async () => {
      repository.findByUsername.mockResolvedValue({ id: 2, username: "tom" });
      await expect(service.create({ username: "tom", nickname: "Tom" })).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it("软删除 - 删除超级管理员ID为1抛出异常", async () => {
      repository.findById.mockResolvedValue({ id: 1, username: "admin" });
      await expect(service.delete(1, { id: 2 })).rejects.toThrow(ForbiddenException);
    });

    it("软删除 - 删除自己抛出异常", async () => {
      repository.findById.mockResolvedValue({ id: 3, username: "jerry" });
      await expect(service.delete(3, { id: 3 })).rejects.toThrow(ForbiddenException);
    });

    it("禁用用户 - 禁用管理员ID为1抛出异常", async () => {
      repository.findById.mockResolvedValue({ id: 1, username: "admin" });
      await expect(service.updateStatus(1, "disabled")).rejects.toThrow(ForbiddenException);
    });
  });
  ```

- [ ] **Step 3.2: 运行测试以验证红灯**
  运行：`pnpm --filter @sekiro/api test`
  预期：测试运行报错（因 UserService 类尚未创建或方法没有实现）。

- [ ] **Step 3.3: 编写 UserService 实现**
  在 `apps/api/src/modules/user/services/user.service.ts` 写入：
  ```typescript
  import { Injectable, Inject, ForbiddenException, UnprocessableEntityException, NotFoundException } from "@nestjs/common";
  import { UserRepository } from "../repositories/user.repository";
  import { CreateUserDto, UpdateUserDto, QueryUserDto } from "../dtos";
  import * as bcrypt from "bcrypt";

  @Injectable()
  export class UserService {
    constructor(
      @Inject(UserRepository) private readonly userRepo: UserRepository,
    ) {}

    async getPage(query: QueryUserDto, deptIdsScope: number[] | null) {
      return this.userRepo.findPage(query, deptIdsScope);
    }

    async getDetail(id: number) {
      const user = await this.userRepo.findById(id);
      if (!user) {
        throw new NotFoundException("用户不存在");
      }
      return user;
    }

    async create(data: CreateUserDto) {
      const existing = await this.userRepo.findByUsername(data.username);
      if (existing) {
        throw new UnprocessableEntityException("用户名已存在");
      }
      const defaultPasswordHash = await bcrypt.hash("sekiro123", 10);
      return this.userRepo.create(data, defaultPasswordHash);
    }

    async update(id: number, data: UpdateUserDto) {
      const user = await this.userRepo.findById(id);
      if (!user) {
        throw new NotFoundException("用户不存在");
      }
      return this.userRepo.update(id, data);
    }

    async delete(id: number, currentUser: { id: number }) {
      const user = await this.userRepo.findById(id);
      if (!user) {
        throw new NotFoundException("用户不存在");
      }
      if (id === 1) {
        throw new ForbiddenException("超级管理员账号不可删除");
      }
      if (id === currentUser.id) {
        throw new ForbiddenException("不能删除当前登录的自己");
      }
      return this.userRepo.softDelete(id);
    }

    async updateStatus(id: number, status: string) {
      const user = await this.userRepo.findById(id);
      if (!user) {
        throw new NotFoundException("用户不存在");
      }
      if (id === 1 && status === "disabled") {
        throw new ForbiddenException("不可停用超级管理员账号");
      }
      return this.userRepo.updateStatus(id, status);
    }

    async resetPassword(id: number) {
      const user = await this.userRepo.findById(id);
      if (!user) {
        throw new NotFoundException("用户不存在");
      }
      const defaultPasswordHash = await bcrypt.hash("sekiro123", 10);
      return this.userRepo.updatePassword(id, defaultPasswordHash);
    }
  }
  ```

- [ ] **Step 3.4: 重新运行测试验证绿灯**
  运行：`pnpm --filter @sekiro/api test`
  预期：所有 user 相关的测试均成功通过（绿灯）。

- [ ] **Step 3.5: Commit**
  运行：`git add apps/api/src/modules/user/services/user.service.ts apps/api/src/modules/user/__tests__/user.service.spec.ts && git commit -m "feat(user): implement UserService with defensive safety logic and pass unit tests"`

---

### Task 4: 角色与岗位分配（数据关系层）

**Files:**
- Modify: `apps/api/src/modules/user/repositories/user.repository.ts`
- Modify: `apps/api/src/modules/user/services/user.service.ts`
- Modify: `apps/api/src/modules/user/__tests__/user.service.spec.ts`

**Interfaces:**
- Produces: `assignRoles` & `assignPositions` in Repo/Service.

- [ ] **Step 4.1: 补充关联分配测试**
  在 `apps/api/src/modules/user/__tests__/user.service.spec.ts` 末尾追加测试用例：
  ```typescript
  it("分配角色 - 成功调用仓储层操作", async () => {
    repository.findById.mockResolvedValue({ id: 2, username: "tom" });
    repository.assignRoles = vi.fn().mockResolvedValue(undefined);
    await service.assignRoles(2, [1, 2]);
    expect(repository.assignRoles).toHaveBeenCalledWith(2, [1, 2]);
  });
  ```

- [ ] **Step 4.2: 在 UserRepository 中实现关联操作**
  修改 `apps/api/src/modules/user/repositories/user.repository.ts`，追加以下方法：
  ```typescript
  async assignRoles(id: number, roleIds: number[]) {
    await this.prisma.$transaction(async (tx) => {
      // 全量覆盖：先删后插
      await tx.userRole.deleteMany({ where: { userId: id } });
      if (roleIds.length > 0) {
        await tx.userRole.createMany({
          data: roleIds.map((roleId) => ({ userId: id, roleId })),
        });
      }
    });
  }

  async assignPositions(id: number, positionIds: number[]) {
    await this.prisma.$transaction(async (tx) => {
      // 全量覆盖：先删后插
      await tx.userPosition.deleteMany({ where: { userId: id } });
      if (positionIds.length > 0) {
        await tx.userPosition.createMany({
          data: positionIds.map((positionId) => ({ userId: id, positionId })),
        });
      }
    });
  }
  ```

- [ ] **Step 4.3: 在 UserService 中添加分配业务编排**
  修改 `apps/api/src/modules/user/services/user.service.ts`，追加以下方法：
  ```typescript
  async assignRoles(id: number, roleIds: number[]) {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundException("用户不存在");
    }
    return this.userRepo.assignRoles(id, roleIds);
  }

  async assignPositions(id: number, positionIds: number[]) {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundException("用户不存在");
    }
    return this.userRepo.assignPositions(id, positionIds);
  }
  ```

- [ ] **Step 4.4: 验证测试通过**
  运行：`pnpm --filter @sekiro/api test`
  预期：全部通过。

- [ ] **Step 4.5: Commit**
  运行：`git add apps/api/src/modules/user/ && git commit -m "feat(user): add assignRoles and assignPositions db transaction logic"`

---

### Task 5: UserController 控制器与 API 层集成

**Files:**
- Create: `apps/api/src/modules/user/user.controller.ts`
- Create: `apps/api/src/modules/user/user.module.ts`
- Create: `apps/api/src/modules/user/index.ts`
- Modify: `apps/api/src/main.ts`

**Interfaces:**
- Produces: REST API endpoints for `/system/user`

- [ ] **Step 5.1: 编写 UserController**
  在 `apps/api/src/modules/user/user.controller.ts` 写入：
  ```typescript
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
  } from "@nestjs/common";
  import { UserService } from "./services/user.service";
  import { CreateUserDto, UpdateUserDto, QueryUserDto } from "./dtos";
  import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
  import { CommonStatus, ApiResponse } from "@sekiro/shared";

  @Controller("system/user")
  @UseGuards(JwtAuthGuard)
  export class UserController {
    constructor(
      @Inject(UserService) private readonly userService: UserService,
    ) {}

    @Get()
    async getPage(@Query() query: QueryUserDto): Promise<ApiResponse<any>> {
      const data = await this.userService.getPage(query, null);
      return { code: 0, message: "查询成功", data };
    }

    @Get(":id")
    async getDetail(@Param("id", ParseIntPipe) id: number): Promise<ApiResponse<any>> {
      const data = await this.userService.getDetail(id);
      return { code: 0, message: "查询成功", data };
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
  ```

- [ ] **Step 5.2: 编写 UserModule**
  在 `apps/api/src/modules/user/user.module.ts` 写入：
  ```typescript
  import { Module } from "@nestjs/common";
  import { UserController } from "./user.controller";
  import { UserService } from "./services/user.service";
  import { UserRepository } from "./repositories/user.repository";
  import { PrismaModule } from "../prisma/prisma.module";
  import { AuthModule } from "../auth/auth.module";

  @Module({
    imports: [PrismaModule, AuthModule],
    controllers: [UserController],
    providers: [UserService, UserRepository],
    exports: [UserService, UserRepository],
  })
  export class UserModule {}
  ```

- [ ] **Step 5.3: 创建入口导出**
  在 `apps/api/src/modules/user/index.ts` 写入：
  ```typescript
  export * from "./user.module";
  export * from "./user.controller";
  ```

- [ ] **Step 5.4: 注册 UserModule 到 AppModule**
  修改 `apps/api/src/main.ts`，在 `@Module` 的 `imports` 列表中引入 `UserModule`：
  ```typescript
  // 修改 apps/api/src/main.ts，第 6 行附近：
  import { AuthModule } from "./modules/auth";
  import { UserModule } from "./modules/user"; // [NEW]

  @Module({
    imports: [PrismaModule, RedisModule, AuthModule, UserModule], // [MODIFY]
  })
  class AppModule {}
  ```

- [ ] **Step 5.5: 验证整体编译与测试**
  运行：`pnpm --filter @sekiro/api typecheck` 和 `pnpm --filter @sekiro/api test`
  预期：全量编译成功，且 100% 单元测试成功通过。

- [ ] **Step 5.6: Commit**
  运行：`git add apps/api/src/modules/user/ apps/api/src/main.ts && git commit -m "feat(user): implement UserController and register UserModule in AppModule"`

---

### Task 6: 联调与集成验证

**Files:**
- None (API Verification)

- [ ] **Step 6.1: 启动 PostgreSQL 与 Redis 容器**
  运行：`pnpm docker:up`
  预期：看到 pg/redis 容器正常拉起。

- [ ] **Step 6.2: 运行 Nest API 开发服务**
  运行：`pnpm dev:api`
  预期：看到 API 成功运行在 `http://localhost:3001`，且 Mapped `{/system/user, GET/POST...}` 等所有路由。

- [ ] **Step 6.3: 手动模拟接口流测试**
  在另一个终端窗口中执行以下命令行：

  1. **登录获取 JWT Token**
     ```bash
     TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \
       -H "Content-Type: application/json" \
       -d '{"username":"admin","password":"admin123"}' | jq -r .data.token)
     echo "Token is: $TOKEN"
     ```

  2. **新建一个测试用户**
     ```bash
     curl -X POST http://localhost:3001/system/user \
       -H "Authorization: Bearer $TOKEN" \
       -H "Content-Type: application/json" \
       -d '{"username":"test_user","nickname":"测试账号","email":"test@sekiro.com"}' | jq .
     ```
     预期：返回 code=0 且返回创建的用户数据。

  3. **查询该用户详情并测试重置密码**
     ```bash
     # 列表检索并获取刚刚创建用户的 ID
     USER_ID=$(curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3001/system/user | jq -r '.data.list[] | select(.username=="test_user") | .id')
     echo "Created User ID: $USER_ID"

     # 重置该用户密码为默认密码 sekiro123
     curl -X PUT http://localhost:3001/system/user/$USER_ID/reset-password \
       -H "Authorization: Bearer $TOKEN" | jq .
     ```

  4. **防御校验测试：删除自己**
     ```bash
     # 管理员尝试删除 ID=1 的超级管理员自己
     curl -X DELETE http://localhost:3001/system/user/1 \
       -H "Authorization: Bearer $TOKEN" | jq .
     ```
     预期：返回 `{"statusCode":403,"message":"超级管理员账号不可删除"}` 或相应防御错误状态。

- [ ] **Step 6.4: 清理环境与最终 Commit**
  运行：`git status` 与 `git commit -a -m "feat(user): complete user CRUD and integration validation"`
