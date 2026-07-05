# Role Management 角色管理模块实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现完整的角色管理模块（CRUD、菜单权限分配、数据范围设置），并修补 AuthService 的鉴权安全漏洞，确保已停用/已删除角色不参与权限计算。

**Architecture:** 标准 NestJS 领域分层 `RoleController ➡️ RoleService ➡️ RoleRepository`，与 User 模块完全对称。额外修补 `auth.service.ts` 中两处角色过滤逻辑。

**Tech Stack:** NestJS 11.x, Prisma 7.x (pg adapter), class-validator, class-transformer, vitest

## Global Constraints
- 所有 HTTP 响应遵循 `ApiResponse<T>` 格式（`code: 0` 成功，错误码通过 `code` 区分）。
- 内置超级管理员角色（`id=1`, `code='admin'`）禁止被删除或停用。
- 角色编码 `code` 必须符合 `^[a-z][a-z0-9_]*$`，且全库唯一。
- 角色名称 `name` 全库唯一。
- 所有构造函数参数必须加 `@Inject()` 装饰器（esbuild/tsx 兼容）。

---

### Task 1: DTO 定义

**Files:**
- Create: `apps/api/src/modules/role/dtos/create-role.dto.ts`
- Create: `apps/api/src/modules/role/dtos/update-role.dto.ts`
- Create: `apps/api/src/modules/role/dtos/query-role.dto.ts`
- Create: `apps/api/src/modules/role/dtos/index.ts`

**Interfaces:**
- Produces: `CreateRoleDto`, `UpdateRoleDto`, `QueryRoleDto`

- [ ] **Step 1.1: 创建 CreateRoleDto**

```typescript
// apps/api/src/modules/role/dtos/create-role.dto.ts
import { IsString, IsOptional, Matches, Length } from "class-validator";

export class CreateRoleDto {
  @IsString({ message: "角色名称必须是字符串" })
  @Length(1, 32, { message: "角色名称长度必须 1-32 位" })
  name!: string;

  @IsString({ message: "角色编码必须是字符串" })
  @Matches(/^[a-z][a-z0-9_]*$/, { message: "角色编码只能包含小写字母、数字和下划线，且以字母开头" })
  code!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;
}
```

- [ ] **Step 1.2: 创建 UpdateRoleDto**

```typescript
// apps/api/src/modules/role/dtos/update-role.dto.ts
import { IsString, IsOptional, Length } from "class-validator";

export class UpdateRoleDto {
  @IsString({ message: "角色名称必须是字符串" })
  @Length(1, 32, { message: "角色名称长度必须 1-32 位" })
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;
}
```

- [ ] **Step 1.3: 创建 QueryRoleDto**

```typescript
// apps/api/src/modules/role/dtos/query-role.dto.ts
import { IsString, IsOptional, IsInt, Min } from "class-validator";
import { Transform } from "class-transformer";

export class QueryRoleDto {
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

- [ ] **Step 1.4: 创建 DTO 重导出**

```typescript
// apps/api/src/modules/role/dtos/index.ts
export * from "./create-role.dto";
export * from "./update-role.dto";
export * from "./query-role.dto";
```

- [ ] **Step 1.5: 验证编译**

Run: `pnpm --filter @sekiro/api typecheck`
Expected: 编译成功，无错误。

- [ ] **Step 1.6: Commit**

```bash
git add apps/api/src/modules/role/dtos/ && git commit -m "feat(role): add role module DTOs"
```

---

### Task 2: RoleRepository 数据层实现

**Files:**
- Create: `apps/api/src/modules/role/repositories/role.repository.ts`

**Interfaces:**
- Consumes: `PrismaService`
- Produces: `RoleRepository` methods (`findPage`, `findById`, `findByCode`, `findByName`, `create`, `update`, `softDelete`, `updateStatus`, `assignMenus`, `setDataScope`)

- [ ] **Step 2.1: 编写 RoleRepository**

```typescript
// apps/api/src/modules/role/repositories/role.repository.ts
import { Injectable, Inject } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateRoleDto, UpdateRoleDto, QueryRoleDto } from "../dtos";

@Injectable()
export class RoleRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async findById(id: number) {
    return this.prisma.role.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByCode(code: string) {
    return this.prisma.role.findFirst({
      where: { code, deletedAt: null },
    });
  }

  async findByName(name: string) {
    return this.prisma.role.findFirst({
      where: { name, deletedAt: null },
    });
  }

  async create(data: CreateRoleDto) {
    return this.prisma.role.create({
      data: {
        name: data.name,
        code: data.code,
        description: data.description,
      },
    });
  }

  async update(id: number, data: UpdateRoleDto) {
    return this.prisma.role.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
      },
    });
  }

  async softDelete(id: number) {
    return this.prisma.role.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async updateStatus(id: number, status: string) {
    return this.prisma.role.update({
      where: { id },
      data: { status },
    });
  }

  async assignMenus(id: number, menuIds: number[]) {
    await this.prisma.$transaction(async (tx) => {
      await tx.roleMenu.deleteMany({ where: { roleId: id } });
      if (menuIds.length > 0) {
        await tx.roleMenu.createMany({
          data: menuIds.map((menuId) => ({ roleId: id, menuId })),
        });
      }
    });
  }

  async setDataScope(id: number, dataScope: string, customDeptIds: number[]) {
    await this.prisma.$transaction(async (tx) => {
      await tx.role.update({
        where: { id },
        data: { dataScope },
      });
      await tx.roleDept.deleteMany({ where: { roleId: id } });
      if (dataScope === "custom" && customDeptIds.length > 0) {
        await tx.roleDept.createMany({
          data: customDeptIds.map((deptId) => ({ roleId: id, deptId })),
        });
      }
    });
  }

  async findPage(query: QueryRoleDto) {
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

    const total = await this.prisma.role.count({ where });
    const list = await this.prisma.role.findMany({
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

Run: `pnpm --filter @sekiro/api typecheck`
Expected: 无 TypeScript 编译错误。

- [ ] **Step 2.3: Commit**

```bash
git add apps/api/src/modules/role/repositories/ && git commit -m "feat(role): implement RoleRepository with CRUD and menu/data-scope assignment"
```

---

### Task 3: RoleService 业务逻辑与单元测试 (TDD)

**Files:**
- Create: `apps/api/src/modules/role/__tests__/role.service.spec.ts`
- Create: `apps/api/src/modules/role/services/role.service.ts`

**Interfaces:**
- Consumes: `RoleRepository`
- Produces: `RoleService` with safety guards

- [ ] **Step 3.1: 编写 RoleService 单元测试**

```typescript
// apps/api/src/modules/role/__tests__/role.service.spec.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { RoleService } from "../services/role.service";
import { ForbiddenException, UnprocessableEntityException, NotFoundException } from "@nestjs/common";

describe("RoleService", () => {
  let service: RoleService;
  let repository: any;

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
      findByCode: vi.fn(),
      findByName: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      updateStatus: vi.fn(),
      assignMenus: vi.fn(),
      setDataScope: vi.fn(),
      findPage: vi.fn(),
    };
    service = new RoleService(repository);
  });

  it("新建角色 - code 已存在抛出异常", async () => {
    repository.findByCode.mockResolvedValue({ id: 2, code: "editor" });
    repository.findByName.mockResolvedValue(null);
    await expect(
      service.create({ name: "编辑者", code: "editor" }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it("新建角色 - name 已存在抛出异常", async () => {
    repository.findByCode.mockResolvedValue(null);
    repository.findByName.mockResolvedValue({ id: 2, name: "编辑者" });
    await expect(
      service.create({ name: "编辑者", code: "editor2" }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it("软删除 - 删除内置 admin 角色抛出异常", async () => {
    repository.findById.mockResolvedValue({ id: 1, code: "admin" });
    await expect(service.delete(1)).rejects.toThrow(ForbiddenException);
  });

  it("软删除 - 角色不存在抛出异常", async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.delete(999)).rejects.toThrow(NotFoundException);
  });

  it("禁用角色 - 禁用内置 admin 角色抛出异常", async () => {
    repository.findById.mockResolvedValue({ id: 1, code: "admin" });
    await expect(service.updateStatus(1, "disabled")).rejects.toThrow(ForbiddenException);
  });

  it("分配菜单 - 成功调用仓储层", async () => {
    repository.findById.mockResolvedValue({ id: 2, code: "editor" });
    repository.assignMenus.mockResolvedValue(undefined);
    await service.assignMenus(2, [10, 20, 30]);
    expect(repository.assignMenus).toHaveBeenCalledWith(2, [10, 20, 30]);
  });

  it("设置数据范围 - 成功调用仓储层", async () => {
    repository.findById.mockResolvedValue({ id: 2, code: "editor" });
    repository.setDataScope.mockResolvedValue(undefined);
    await service.setDataScope(2, "custom", [101, 102]);
    expect(repository.setDataScope).toHaveBeenCalledWith(2, "custom", [101, 102]);
  });
});
```

- [ ] **Step 3.2: 运行测试验证红灯**

Run: `pnpm --filter @sekiro/api test`
Expected: FAIL — `Cannot find module '../services/role.service'`

- [ ] **Step 3.3: 编写 RoleService 实现**

```typescript
// apps/api/src/modules/role/services/role.service.ts
import { Injectable, Inject, ForbiddenException, UnprocessableEntityException, NotFoundException } from "@nestjs/common";
import { RoleRepository } from "../repositories/role.repository";
import { CreateRoleDto, UpdateRoleDto, QueryRoleDto } from "../dtos";

@Injectable()
export class RoleService {
  constructor(
    @Inject(RoleRepository) private readonly roleRepo: RoleRepository,
  ) {}

  async getPage(query: QueryRoleDto) {
    return this.roleRepo.findPage(query);
  }

  async getDetail(id: number) {
    const role = await this.roleRepo.findById(id);
    if (!role) {
      throw new NotFoundException("角色不存在");
    }
    return role;
  }

  async create(data: CreateRoleDto) {
    const existingCode = await this.roleRepo.findByCode(data.code);
    if (existingCode) {
      throw new UnprocessableEntityException("角色编码已存在");
    }
    const existingName = await this.roleRepo.findByName(data.name);
    if (existingName) {
      throw new UnprocessableEntityException("角色名称已存在");
    }
    return this.roleRepo.create(data);
  }

  async update(id: number, data: UpdateRoleDto) {
    const role = await this.roleRepo.findById(id);
    if (!role) {
      throw new NotFoundException("角色不存在");
    }
    // 检查 name 唯一性（排除自身）
    const existingName = await this.roleRepo.findByName(data.name);
    if (existingName && existingName.id !== id) {
      throw new UnprocessableEntityException("角色名称已存在");
    }
    return this.roleRepo.update(id, data);
  }

  async delete(id: number) {
    const role = await this.roleRepo.findById(id);
    if (!role) {
      throw new NotFoundException("角色不存在");
    }
    if (id === 1 || role.code === "admin") {
      throw new ForbiddenException("内置超级管理员角色不可删除");
    }
    return this.roleRepo.softDelete(id);
  }

  async updateStatus(id: number, status: string) {
    const role = await this.roleRepo.findById(id);
    if (!role) {
      throw new NotFoundException("角色不存在");
    }
    if ((id === 1 || role.code === "admin") && status === "disabled") {
      throw new ForbiddenException("内置超级管理员角色不可被停用");
    }
    return this.roleRepo.updateStatus(id, status);
  }

  async assignMenus(id: number, menuIds: number[]) {
    const role = await this.roleRepo.findById(id);
    if (!role) {
      throw new NotFoundException("角色不存在");
    }
    return this.roleRepo.assignMenus(id, menuIds);
  }

  async setDataScope(id: number, dataScope: string, customDeptIds: number[]) {
    const role = await this.roleRepo.findById(id);
    if (!role) {
      throw new NotFoundException("角色不存在");
    }
    return this.roleRepo.setDataScope(id, dataScope, customDeptIds);
  }
}
```

- [ ] **Step 3.4: 重新运行测试验证绿灯**

Run: `pnpm --filter @sekiro/api test`
Expected: 所有测试通过（包括 role 相关的 7 个新测试）。

- [ ] **Step 3.5: Commit**

```bash
git add apps/api/src/modules/role/services/ apps/api/src/modules/role/__tests__/ && git commit -m "feat(role): implement RoleService with safety guards and pass unit tests"
```

---

### Task 4: 鉴权安全补丁 (Auth Patch)

**Files:**
- Modify: `apps/api/src/modules/auth/services/auth.service.ts:250-253` (`getUserPermissions`)
- Modify: `apps/api/src/modules/auth/services/auth.service.ts:288-290` (`buildMenuTree`)

**Interfaces:**
- Consumes: `PrismaService` (existing)
- Produces: patched auth logic that filters disabled/deleted roles

- [ ] **Step 4.1: 修改 getUserPermissions 方法**

在 `apps/api/src/modules/auth/services/auth.service.ts` 第 251-253 行，将：

```typescript
    const userRoles = await this.prismaService.userRole.findMany({
      where: { userId },
    });
```

替换为：

```typescript
    const userRoles = await this.prismaService.userRole.findMany({
      where: {
        userId,
        role: {
          deletedAt: null,
          status: 'enabled',
        },
      },
    });
```

- [ ] **Step 4.2: 修改 buildMenuTree 方法**

在 `apps/api/src/modules/auth/services/auth.service.ts` 第 288-290 行，将：

```typescript
    const userRoles = await this.prismaService.userRole.findMany({
      where: { userId },
    });
```

替换为：

```typescript
    const userRoles = await this.prismaService.userRole.findMany({
      where: {
        userId,
        role: {
          deletedAt: null,
          status: 'enabled',
        },
      },
    });
```

- [ ] **Step 4.3: 运行全部测试确保无回归**

Run: `pnpm --filter @sekiro/api test`
Expected: 全部测试通过，无回归。

- [ ] **Step 4.4: Commit**

```bash
git add apps/api/src/modules/auth/services/auth.service.ts && git commit -m "fix(auth): filter disabled/deleted roles from permission and menu computation (INV-6)"
```

---

### Task 5: RoleController 与 API 集成

**Files:**
- Create: `apps/api/src/modules/role/role.controller.ts`
- Create: `apps/api/src/modules/role/role.module.ts`
- Create: `apps/api/src/modules/role/index.ts`
- Modify: `apps/api/src/main.ts:14,17` (注册 RoleModule)

**Interfaces:**
- Produces: REST API endpoints for `/system/role`

- [ ] **Step 5.1: 编写 RoleController**

```typescript
// apps/api/src/modules/role/role.controller.ts
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
```

- [ ] **Step 5.2: 编写 RoleModule**

```typescript
// apps/api/src/modules/role/role.module.ts
import { Module } from "@nestjs/common";
import { RoleController } from "./role.controller";
import { RoleService } from "./services/role.service";
import { RoleRepository } from "./repositories/role.repository";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [RoleController],
  providers: [RoleService, RoleRepository],
  exports: [RoleService, RoleRepository],
})
export class RoleModule {}
```

- [ ] **Step 5.3: 创建入口导出**

```typescript
// apps/api/src/modules/role/index.ts
export * from "./role.module";
export * from "./role.controller";
```

- [ ] **Step 5.4: 注册 RoleModule 到 AppModule**

修改 `apps/api/src/main.ts`：

```typescript
import { AuthModule } from "./modules/auth";
import { UserModule } from "./modules/user";
import { RoleModule } from "./modules/role"; // [NEW]

@Module({
  imports: [PrismaModule, RedisModule, AuthModule, UserModule, RoleModule], // [MODIFY]
})
class AppModule {}
```

- [ ] **Step 5.5: 验证编译与全量测试**

Run: `pnpm --filter @sekiro/api typecheck && pnpm --filter @sekiro/api test`
Expected: 编译成功且全部测试通过。

- [ ] **Step 5.6: Commit**

```bash
git add apps/api/src/modules/role/ apps/api/src/main.ts && git commit -m "feat(role): implement RoleController and integrate RoleModule"
```

---

### Task 6: 联调与集成验证

**Files:**
- None (API Verification)

- [ ] **Step 6.1: 启动 API 开发服务**

Run: `pnpm dev:api`
Expected: 看到 `{/system/role, GET/POST}` 等全部 8 条角色路由被映射。

- [ ] **Step 6.2: 手动模拟接口流测试**

```bash
# 1. 登录获取 Token
TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r .data.token)

# 2. 查询角色列表
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/system/role | jq .

# 3. 新建测试角色
curl -s -X POST http://localhost:3001/system/role \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"测试角色","code":"test_role"}' | jq .

# 4. 防御校验 — 尝试删除 admin 角色
curl -s -X DELETE http://localhost:3001/system/role/1 \
  -H "Authorization: Bearer $TOKEN" | jq .
# Expected: 403 "内置超级管理员角色不可删除"

# 5. 分配菜单权限
ROLE_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/system/role | jq -r '.data.list[] | select(.code=="test_role") | .id')
curl -s -X PUT http://localhost:3001/system/role/$ROLE_ID/menus \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"menuIds":[1,2,3]}' | jq .
# Expected: code=0
```

- [ ] **Step 6.3: 最终 Commit**

```bash
git status && git commit -a -m "feat(role): complete Role Management Story #8 integration verification"
```

## Verification Plan

### Automated Tests
- `pnpm --filter @sekiro/api test` — 确保全部测试通过（包括原有 56 个 + 新增 7 个角色测试 = 63 个）。

### Manual Verification
- 使用 curl 验证角色 CRUD、菜单分配及超管保护拦截。
- 确认 auth 补丁后，停用一个角色后其用户的 token 仍有效但权限列表不再包含该角色的权限。
