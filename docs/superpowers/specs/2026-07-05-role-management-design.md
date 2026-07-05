# Story #8: Role 角色管理模块设计规格

**文档版本**：v1.0  
**创建日期**：2026-07-05  
**状态**：设计已批准  
**相关 Issue**：Story #8（角色管理）  
**相关 SPEC**：`docs/SPEC.md` §3.1, §4.5, §5.1, §5.2, §5.3

---

## 1. 概述与范围

### 1.1 目标
实现 Sekiro 后台管理系统的**角色管理模块**（Role），支持：
- 角色信息的基础 CRUD（分页查询、新建、编辑、软删除、状态启停）
- 角色与菜单关联分配（分配菜单/按钮权限，采用事务全量覆盖机制）
- 角色数据范围配置（为各种查询计算可见部门 ID 集合，支持 `all`, `dept_and_below`, `dept`, `self`, `custom`）
- 增强鉴权安全性：自动过滤已被软删除或已禁用的角色，防止这些角色的权限被关联用户继续使用。

### 1.2 业务原则与规则
- **超级管理员角色保护 (INV-7 扩展)**：
  - 角色编码为 `admin`（ID = 1）的内置超级管理员角色**禁止被软删除**，且**状态禁止被停用 (disabled)**。
- **字段校验规则 (DTO 校验)**：
  - `code`：必填，支持正则 `^[a-z][a-z0-9_]*$`，全库唯一（除已软删除的外）。
  - `name`：必填，全库唯一（除已软删除的外）。
- **软删除数据隔离**：
  - 角色的删除全部为软删除（设置 `deletedAt` 为当前时间）。
- **鉴权强一致性安全机制 (INV-6 扩展)**：
  - 在 `AuthService` 进行登录和验证时，查询用户的角色记录均会通过关系（Relation Join）关联 `Role` 实体，强行过滤掉已软删除或非启用的角色记录。

---

## 2. 架构设计与目录结构

采用标准的 `Controller ➡️ Service ➡️ Repository` 分层设计：

```
apps/api/src/modules/role/
├── role.module.ts                      # 注册 RoleController、RoleService 和 RoleRepository
├── role.controller.ts                  # API 控制器与参数校验
├── services/
│   └── role.service.ts                 # 业务逻辑编排与超管锁逻辑
├── repositories/
│   └── role.repository.ts              # 封装数据库操作与 Prisma 细节
├── dtos/
│   ├── create-role.dto.ts              # 新建角色校验 DTO
│   ├── update-role.dto.ts              # 编辑角色校验 DTO
│   ├── query-role.dto.ts               # 分页条件校验 DTO
│   └── index.ts                        # DTO 重导出
├── index.ts                            # 统一导出
└── __tests__/
    └── role.service.spec.ts            # 业务服务单测
```

---

## 3. 仓储层 (RoleRepository) 接口设计

`RoleRepository` 注入 `PrismaService`，封装所有针对 `Role`、`RoleMenu`、`RoleDept` 表的 SQL/Prisma 行为，向外暴露出纯粹的业务查询方法：

```typescript
export class RoleRepository {
  /**
   * 分页与条件查询角色列表 (自动过滤已软删除的角色)
   */
  async findPage(query: QueryRoleDto): Promise<PageResult<Role>>;

  /**
   * 根据 ID 查询未被软删除的角色详情
   */
  async findById(id: number): Promise<Role | null>;

  /**
   * 根据角色唯一编码查询未被软删除的角色 (用于新建/编辑查重)
   */
  async findByCode(code: string): Promise<Role | null>;

  /**
   * 根据角色名称查询未被软删除的角色 (用于新建/编辑查重)
   */
  async findByName(name: string): Promise<Role | null>;

  /**
   * 创建角色基础记录
   */
  async create(data: CreateRoleDto): Promise<Role>;

  /**
   * 更新角色基础记录 (忽略 code 改动)
   */
  async update(id: number, data: UpdateRoleDto): Promise<Role>;

  /**
   * 软删除角色 (设置 deletedAt 为当前时间)
   */
  async softDelete(id: number): Promise<Role>;

  /**
   * 更改角色启用/停用状态
   */
  async updateStatus(id: number, status: string): Promise<Role>;

  /**
   * 分配菜单：在事务中先删除旧关联，再插入新关联 (覆盖 role_menu 表)
   */
  async assignMenus(id: number, menuIds: number[]): Promise<void>;

  /**
   * 设置数据权限范围：在事务中更新角色 `dataScope` 字段，并覆盖关联的 `role_dept` 关系
   */
  async setDataScope(id: number, dataScope: string, customDeptIds: number[]): Promise<void>;
}
```

---

## 4. 业务服务层 (RoleService) 与安全补丁设计

### 4.1 新增与修改校验
- **新增**：
  1. 校验 `code` 的唯一性：调用 `roleRepo.findByCode(code)`。若存在则抛出 `UnprocessableEntityException` (422,「角色编码已存在」)。
  2. 校验 `name` 的唯一性：调用 `roleRepo.findByName(name)`。若存在则抛出 `UnprocessableEntityException` (422,「角色名称已存在」)。
- **编辑**：
  1. 校验目标角色是否存在：若不存在抛出 `NotFoundException` (404)。
  2. 校验新的 `name` 的唯一性（若名称改变），且在写入时强制剔除并忽略 `code` 载荷。

### 4.2 软删除与状态启停
- **软删除**：
  1. 校验目标角色是否存在。
  2. 拦截安全红线：若目标 `id === 1` 或角色 `code === 'admin'`，抛出 `ForbiddenException` (403,「内置超级管理员角色不可删除」)。
  3. 调用 `roleRepo.softDelete(id)` 并返回。
- **状态启停**：
  1. 校验目标角色是否存在。
  2. 拦截安全红线：若目标 `id === 1` 且目标状态为 `disabled`，抛出 `ForbiddenException` (403,「内置超级管理员角色不可被停用」)。
  3. 调用 `roleRepo.updateStatus(id, status)` 并返回。

### 4.3 鉴权安全补丁 (Auth Patch)
修改 `apps/api/src/modules/auth/services/auth.service.ts` 中查询用户拥有的角色关系部分。
- 目标代码：`getUserPermissions()` 与 `buildMenuTree()`
- 修改点：
  ```typescript
  // 仅查询关联的未被软删除且处于启用（enabled）状态的角色
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

---

## 5. API 控制器与路由定义 (RoleController)

```typescript
@Controller("system/role")
@UseGuards(JwtAuthGuard)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @RequirePermissions("system:role:list")
  async getPage(@Query() query: QueryRoleDto);

  @Get(":id")
  @RequirePermissions("system:role:list")
  async getDetail(@Param("id", ParseIntPipe) id: number);

  @Post()
  @RequirePermissions("system:role:create")
  @HttpCode(200)
  async create(@Body() createDto: CreateRoleDto);

  @Put(":id")
  @RequirePermissions("system:role:update")
  @HttpCode(200)
  async update(@Param("id", ParseIntPipe) id: number, @Body() updateDto: UpdateRoleDto);

  @Delete(":id")
  @RequirePermissions("system:role:delete")
  @HttpCode(200)
  async delete(@Param("id", ParseIntPipe) id: number);

  @Put(":id/status")
  @RequirePermissions("system:role:update")
  @HttpCode(200)
  async updateStatus(@Param("id", ParseIntPipe) id: number, @Body("status") status: string);

  @Put(":id/menus")
  @RequirePermissions("system:role:assign-role")
  @HttpCode(200)
  async assignMenus(@Param("id", ParseIntPipe) id: number, @Body("menuIds") menuIds: number[]);

  @Put(":id/data-scope")
  @RequirePermissions("system:role:update")
  @HttpCode(200)
  async setDataScope(
    @Param("id", ParseIntPipe) id: number,
    @Body("dataScope") dataScope: string,
    @Body("customDeptIds") customDeptIds: number[],
  );
}
```

---

## 6. 测试策略与用例规范 (TDD)

### 6.1 RoleService 单元测试用例
- `create()`：
  - 成功创建新角色。
  - code 重复时抛出 `UnprocessableEntityException`。
  - name 重复时抛出 `UnprocessableEntityException`。
- `delete()`：
  - 成功软删除角色。
  - 尝试删除内置 admin 角色时抛出 `ForbiddenException`。
- `updateStatus()`：
  - 成功转换状态。
  - 尝试停用内置 admin 角色时抛出 `ForbiddenException`。
