# Story #7: User 用户管理模块设计规格

**文档版本**：v1.0  
**创建日期**：2026-07-05  
**状态**：设计已批准  
**相关 Issue**：Story #7（用户管理）  
**相关 SPEC**：`docs/SPEC.md` §3.1, §4.4, §5.1, §5.3

---

## 1. 概述与范围

### 1.1 目标
实现 Sekiro 后台管理系统的**用户管理模块**（User），支持：
- 用户信息的基础 CRUD（增删改查、状态启停）
- 密码重置（重置为系统默认密码 `sekiro123`）
- 独立的权限管理分配（用户-角色关联分配、用户-岗位关联分配）
- 数据可见性范围过滤（结合数据权限进行分页数据截取）

### 1.2 业务原则与规则
- **默认密码策略**：在创建新用户或执行密码重置时，一律自动初始化为系统固定默认密码：`sekiro123`，并经过 Bcrypt (cost=10) 进行单向哈希处理存储。
- **严格隔离**：基础 CRUD 接口与权限分配解耦，严禁在创建和编辑 Payload 中包含角色（roleIds）和岗位（positionIds），仅能通过独立的 `/roles` 和 `/positions` 关联表分配接口来处理。
- **软删除保留关联**：执行用户删除时仅将用户表的 `deletedAt` 置为当前时间。保留 `user_role` 与 `user_position` 关联表的数据，以保证用户在未来如果被恢复时权限关系可以完全复用。
- **不变量守护 (Safety Guards)**：
  - 超级管理员（ID = 1，即 `admin` 账号）受到硬编码级保护：**禁止删除**，且**禁止将其状态置为停用 (disabled)**。
  - 当前登录用户受到保护：**禁止自己在用户列表中将自己删除**。

---

## 2. 架构设计与目录结构

采用标准的 `Controller ➡️ Service ➡️ Repository` 分层设计：

```
apps/api/src/modules/user/
├── user.module.ts                      # 注册 UserController、UserService 和 UserRepository
├── user.controller.ts                  # API 控制器与参数校验
├── services/
│   └── user.service.ts                 # 业务逻辑编排与不变量守护
├── repositories/
│   └── user.repository.ts              # 封装数据库操作与 Prisma 细节
├── dtos/
│   ├── create-user.dto.ts              # 新建用户校验 DTO
│   ├── update-user.dto.ts              # 编辑用户校验 DTO
│   ├── query-user.dto.ts               # 分页条件校验 DTO
│   └── index.ts                        # DTO 重导出
├── index.ts                            # 统一导出
└── __tests__/
    ├── user.service.spec.ts            # 业务服务单测
    └── user.repository.spec.ts         # 数据库访问单测
```

---

## 3. 仓储层 (UserRepository) 接口设计

`UserRepository` 注入 `PrismaService`，封装所有针对 `User`、`UserRole`、`UserPosition` 表的 SQL/Prisma 行为，向外暴露出纯粹 of 业务查询方法：

```typescript
export class UserRepository {
  /**
   * 分页与条件查询用户列表 (自动过滤已软删除的用户)
   * 支持 keyword、deptId、status 条件过滤，并支持注入数据权限部门范围过滤
   */
  async findPage(query: QueryUserDto, deptIdsScope: number[] | null): Promise<PageResult<User>>;

  /**
   * 根据 ID 查询未被软删除的用户详情
   */
  async findById(id: number): Promise<User | null>;

  /**
   * 根据用户名查询未被软删除的用户 (用于新建/编辑查重)
   */
  async findByUsername(username: string): Promise<User | null>;

  /**
   * 创建用户基础记录
   */
  async create(data: CreateUserDto, passwordHash: string): Promise<User>;

  /**
   * 更新用户基础记录 (忽略 username 改动)
   */
  async update(id: number, data: UpdateUserDto): Promise<User>;

  /**
   * 软删除用户 (设置 deletedAt 为当前时间，保留 user_role / user_position 关系)
   */
  async softDelete(id: number): Promise<User>;

  /**
   * 更改启用/停用状态
   */
  async updateStatus(id: number, status: CommonStatus): Promise<User>;

  /**
   * 更新密码哈希值
   */
  async updatePassword(id: number, passwordHash: string): Promise<User>;

  /**
   * 分配角色：在事务中先删除旧关联，再插入新关联
   */
  async assignRoles(id: number, roleIds: number[]): Promise<void>;

  /**
   * 分配岗位：在事务中先删除旧关联，再插入新关联
   */
  async assignPositions(id: number, positionIds: number[]): Promise<void>;
}
```

---

## 4. 业务服务层 (UserService) 设计

`UserService` 注入 `UserRepository`，负责所有的逻辑条件防御与权限前置校验：

### 4.1 新增用户 (create)
1. 校验用户名 `username` 的唯一性：调用 `userRepository.findByUsername(username)`。如果存在，抛出 `UnprocessableEntityException`（业务状态码 422，「用户名已存在」）。
2. 将默认密码 `sekiro123` 使用 `bcrypt.hash(..., 10)` 进行哈希。
3. 调用 `userRepository.create(...)` 并返回。

### 4.2 编辑用户 (update)
1. 校验目标用户是否存在：调用 `userRepository.findById(id)`。若不存在，抛出 `NotFoundException`（业务状态码 404）。
2. 从更新载荷中剔除 `username`，调用 `userRepository.update(...)` 并返回。

### 4.3 软删除用户 (delete)
1. 校验目标用户是否存在，若不存在抛出 404。
2. 校验 **INV-7 (超管守护)**：如果 `id === 1`，抛出 `ForbiddenException`（业务状态码 403，「超级管理员账号不可被删除」）。
3. 校验 **自我保护**：如果 `id === currentUser.id`，抛出 `ForbiddenException`（业务状态码 403，「不能删除当前登录的自己」）。
4. 调用 `userRepository.softDelete(id)` 并返回。

### 4.5 状态启停 (updateStatus)
1. 校验目标用户是否存在，若不存在抛出 404。
2. 校验 **INV-7 (超管守护)**：如果 `id === 1` 且目标 `status === 'disabled'`，抛出 `ForbiddenException`（业务状态码 403，「不可停用超级管理员账号」）。
3. 调用 `userRepository.updateStatus(id, status)` 并返回。

### 4.6 重置密码 (resetPassword)
1. 校验目标用户是否存在，若不存在抛出 404。
2. 使用 `bcrypt.hash("sekiro123", 10)` 获得新哈希。
3. 调用 `userRepository.updatePassword(id, passwordHash)` 并返回。

---

## 5. API 控制器与路由定义 (UserController)

```typescript
@Controller("system/user")
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @RequirePermissions("system:user:list")
  async getPage(@Query() query: QueryUserDto, @Req() req: any);

  @Get(":id")
  @RequirePermissions("system:user:list")
  async getDetail(@Param("id", ParseIntPipe) id: number);

  @Post()
  @RequirePermissions("system:user:create")
  @HttpCode(200)
  async create(@Body() createDto: CreateUserDto);

  @Put(":id")
  @RequirePermissions("system:user:update")
  @HttpCode(200)
  async update(@Param("id", ParseIntPipe) id: number, @Body() updateDto: UpdateUserDto);

  @Delete(":id")
  @RequirePermissions("system:user:delete")
  @HttpCode(200)
  async delete(@Param("id", ParseIntPipe) id: number, @Req() req: any);

  @Put(":id/status")
  @RequirePermissions("system:user:update")
  @HttpCode(200)
  async updateStatus(@Param("id", ParseIntPipe) id: number, @Body() statusDto: UpdateUserStatusDto);

  @Put(":id/reset-password")
  @RequirePermissions("system:user:update")
  @HttpCode(200)
  async resetPassword(@Param("id", ParseIntPipe) id: number);

  @Put(":id/roles")
  @RequirePermissions("system:user:assign-role")
  @HttpCode(200)
  async assignRoles(@Param("id", ParseIntPipe) id: number, @Body() assignRolesDto: AssignRolesDto);

  @Put(":id/positions")
  @RequirePermissions("system:user:assign-position")
  @HttpCode(200)
  async assignPositions(@Param("id", ParseIntPipe) id: number, @Body() assignPositionsDto: AssignPositionsDto);
}
```

---

## 6. 测试策略与用例规范 (TDD)

我们将编写测试用例集，覆盖所有预期的成功和防御性异常流程：

### 6.1 UserService 单元测试列表
- `create()`：
  - 成功创建并正确哈希密码。
  - 用户名重复时抛出 `UnprocessableEntityException`。
- `delete()`：
  - 成功软删除用户。
  - 尝试删除 ID 为 1 时抛出 `ForbiddenException`。
  - 尝试删除当前登录用户时抛出 `ForbiddenException`。
  - 用户不存在时抛出 `NotFoundException`。
- `updateStatus()`：
  - 成功切换状态。
  - 尝试停用 ID 为 1 时抛出 `ForbiddenException`。
- `resetPassword()`：
  - 成功重置密码并哈希。
