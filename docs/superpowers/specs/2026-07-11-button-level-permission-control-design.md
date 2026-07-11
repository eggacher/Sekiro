# 详细设计规格 - 按钮级权限控制 (Button-Level Permission Control)

本设计文档阐述 Sekiro 系统中**按钮级（功能型）权限控制**的设计与实现。当前系统在数据层已支持菜单/按钮权限标识，并在登录与 `/auth/me` 时下发扁平化 `permissions[]`，但：

- **后端**：仅有 `JwtAuthGuard` 做身份认证，所有 `/system/**` 写接口对任意已登录用户开放，无功能权限拦截。
- **前端**：`permissions[]` 已存入 `useAuthStore`，但 6 大管理页面的新增/修改/删除/重置/分配按钮均无条件渲染。

本设计通过“Session 缓存权限 + `@RequiresPermissions` 装饰器 + `PermissionGuard`”实现后端 O(1) 拦截，通过 `usePermission` Hook + `<HasPermission>` 包裹组件实现前端按钮级条件渲染。

关联 Issue: #35。

---

## 0. 关键决策（Design Decisions）

| 决策项 | 选择 | 理由 |
| :--- | :--- | :--- |
| 超级管理员绕过 | **角色编码约定**：guard 检测 `super_admin` 角色编码即短路 | 无需为 super_admin 维护“全部按钮”授权，新增按钮时无需同步补全其 `RoleMenu`；与 `DataScopeService` 的“超管直通”思想一致。 |
| 权限粒度 | **细粒度按操作**（~28 个编码） | 每个写操作一个独立编码，精确区分 create/update/delete/reset/assign/status/data-scope 等不同权力。 |
| 无权限按钮 UX | **完全隐藏**（不渲染） | 最干净的界面，用户只看到能做的事；符合管理后台常规行为。 |
| 旧权限过期 | **接受过期，直至 `/auth/me` 刷新** | `/auth/me` 重算后回写 Session，前端在路由加载时自动调用 → 自然刷新；无需 user→session 索引与主动失效基础设施。 |
| Guard 注册方式 | **per-controller `@UseGuards(JwtAuthGuard, PermissionGuard)`** | 保证 `JwtAuthGuard` 先填充 `req.user`，`PermissionGuard` 后读取；最小改动，不引入全局 guard 重构。 |

---

## 1. 权限标识符方案 (Permission Identifier Scheme)

### 1.1 格式与正则放宽

权限标识符保持 `module:resource:action` 三段式。现有前端 `PERMISSIONS` 常量已使用连字符（如 `system:user:assign-role`、`system:role:assign-permission`），而 `MenuService.validateTypeConstraints` 中按钮类型的正则 `^[a-z]+:[a-z]+:[a-z]+$` **会拒绝含连字符的标识符**，存在前后端不一致。

**放宽正则**为 `^[a-z]+(-[a-z]+)*(:[a-z]+(-[a-z]+)*){2}$`：
- 允许 `resource` / `action` 段含连字符连接的单词（`assign-role`、`dict-item`、`update-status`、`data-scope`）。
- 禁止首/尾连字符、连续双连字符。
- `module` 段仍为单一单词（`system`）。

### 1.2 完整编码集（共 28 个）

| 模块 | 编码 | 对应接口 |
| :--- | :--- | :--- |
| User | `system:user:create` | POST /system/user |
| | `system:user:update` | PUT /system/user/:id |
| | `system:user:delete` | DELETE /system/user/:id |
| | `system:user:reset` | PUT /system/user/:id/reset-password |
| | `system:user:assign-role` | PUT /system/user/:id/roles |
| | `system:user:assign-position` | PUT /system/user/:id/positions |
| | `system:user:update-status` | PUT /system/user/:id/status |
| Role | `system:role:create` | POST /system/role |
| | `system:role:update` | PUT /system/role/:id |
| | `system:role:delete` | DELETE /system/role/:id |
| | `system:role:assign-permission` | PUT /system/role/:id/menus |
| | `system:role:data-scope` | PUT /system/role/:id/data-scope |
| | `system:role:update-status` | PUT /system/role/:id/status |
| Menu | `system:menu:create` / `:update` / `:delete` | POST/PUT/DELETE /system/menu |
| Dept | `system:dept:create` / `:update` / `:delete` | POST/PUT/DELETE /system/dept |
| Position | `system:position:create` / `:update` / `:delete` | POST/PUT/DELETE /system/position |
| Dict | `system:dict:create` / `:update` / `:delete` | POST/PUT/DELETE /system/dict |
| DictItem | `system:dict-item:create` / `:update` / `:delete` | POST/PUT/DELETE /system/dict-item |

**免权限校验（仅登录即可）的自助操作：**
- `PUT /system/user/profile`（updateProfile）
- `PUT /system/user/password`（changePassword）

任何已登录用户均可编辑自己的资料与修改自己的密码，不纳入按钮权限。

### 1.3 超级管理员约定

`super_admin` 角色编码在 guard 与前端 hook 中短路通过所有检查（无需为其 seed 全部按钮授权）。为便于展示/调试，seed 仍将全部 28 个按钮分配给 super_admin，但该授权**不作为绕过的依赖**。

定义共享常量（`packages/shared/src/constants.ts`）：
```typescript
export const SUPER_ADMIN_ROLE = 'super_admin';
```

---

## 2. 后端设计 (NestJS)

### 2.1 Session 扩展

扩展 `apps/api/src/modules/auth/types.ts` 中的 `Session`，新增权限与角色编码：

```typescript
export interface Session {
  userId: number;
  username: string;
  token: string;
  refreshToken: string;
  remember: boolean;
  ip: string;
  userAgent: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  permissions: string[];   // 新增：扁平化按钮权限编码
  roles: string[];          // 新增：真实角色编码（如 ['super_admin']）
}
```

JWT 本身保持不变（其 `roles` claim 实为权限的 module 前缀，不再作为权限判定依据）；**Session 成为权限/角色的唯一数据源**。

### 2.2 登录流程改造 (`AuthService.login` / `loginWithMfa`)

1. 在用户查询中 `include: { roles: { include: { role: true } } }`。
2. 计算 `roles = user.roles.map(ur => ur.role.code)`（与 `getMe` 一致）。
3. 已有 `permissions = await getUserPermissions(user.id)`。
4. 创建 Session 时将 `permissions` 与 `roles` 一并写入 Redis。
5. 返回响应的 `user` 对象新增 `roles` 字段（与 `getMe` 返回结构对齐）。

`loginWithMfa`（MFA 第二步）需同步改造：同样在 Session 写入 `permissions`/`roles`，并在响应 `user` 中返回 `roles`。

### 2.3 `/auth/me` 刷新回写 (`AuthService.getMe`)

`getMe` 已从 DB 重算 `permissions` 与 `roles`。新增逻辑：**将重算结果回写 Redis Session**，使下一次 `PermissionGuard` 检查使用最新权限。这是“接受过期直至刷新”的刷新点——前端 `AuthProvider` 在受控路由加载时调用 `/auth/me`，从而自动刷新会话权限。

### 2.4 `JwtAuthGuard` 改造 (`modules/auth/guards/jwt-auth.guard.ts`)

该 guard 已为校验而 `getSession`；现将其返回的 `permissions` 与 `roles` 一并挂到 `request.user` 上（与 JWT payload 字段合并）。下游 guard 与 handler 均可从 `req.user` 读取。

### 2.5 `@RequiresPermissions` 装饰器 (`modules/auth/decorators/requires-permissions.decorator.ts`)

```typescript
export const PERMISSIONS_KEY = 'requiresPermissions';

// @RequiresPermissions('system:user:create')
export const RequiresPermissions = (code: string) =>
  SetMetadata(PERMISSIONS_KEY, code);
```

单一编码（方法→操作 1:1 映射）。如未来需要多编码，可扩展为数组语义。

### 2.6 `PermissionGuard` (`modules/auth/guards/permission.guard.ts`)

```typescript
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.get<string>(PERMISSIONS_KEY, context.getHandler());
    if (!required) return true;                        // 无装饰器 → 放行（读接口/公共路由）

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) throw new UnauthorizedException({ code: 401, message: '未认证' });

    const roles: string[] = user.roles ?? [];
    if (roles.includes(SUPER_ADMIN_ROLE)) return true; // 超管短路

    const permissions: string[] = user.permissions ?? [];
    if (!permissions.includes(required)) {
      throw new ForbiddenException({ code: 403, message: '无权限访问' });
    }
    return true;
  }
}
```

- 缺失 `permissions` 字段（部署后的旧 Session）按 `[]` 处理（拒绝，不抛异常）。
- `ForbiddenException` 形态与前端 `apiClient` 已有的 403 处理对齐（toast “无权限访问”）。
- 仅依赖 `Reflector`（`@nestjs/core` 全局可用），在 `AuthModule` 注册为 provider 并导出以保持一致性。

### 2.7 Guard 注册与执行顺序

各系统模块 Controller 类级改为：
```typescript
@UseGuards(JwtAuthGuard, PermissionGuard)
```
NestJS 按从左到右执行 → `JwtAuthGuard` 先填充 `req.user` → `PermissionGuard` 再读取。无需将 guard 注册为全局，避免与现有 per-controller `JwtAuthGuard` 的执行顺序冲突。

---

## 3. 后端 Controller 装饰映射

7 个 Controller 类级添加 `@UseGuards(JwtAuthGuard, PermissionGuard)`。GET（列表/详情）接口不加装饰器（`PermissionGuard` 无 metadata 即放行）。写操作方法加 `@RequiresPermissions(...)`：

**User** (`user.controller.ts`) — 9 个写方法，7 个装饰，2 个自助免装饰：

| 方法 | 装饰器 |
| :--- | :--- |
| `updateProfile` PUT /profile | —（自助） |
| `changePassword` PUT /password | —（自助） |
| `create` POST / | `system:user:create` |
| `update` PUT /:id | `system:user:update` |
| `delete` DELETE /:id | `system:user:delete` |
| `updateStatus` PUT /:id/status | `system:user:update-status` |
| `resetPassword` PUT /:id/reset-password | `system:user:reset` |
| `assignRoles` PUT /:id/roles | `system:user:assign-role` |
| `assignPositions` PUT /:id/positions | `system:user:assign-position` |

**Role**：`create`/`update`/`delete` → `:create`/`:update`/`:delete`；`updateStatus` → `:update-status`；`assignMenus` → `:assign-permission`；`setDataScope` → `:data-scope`。

**Menu / Dept / Position**：`create`/`update`/`delete` → 各自 `:create`/`:update`/`:delete`。

**Dict**：`create`/`update`/`delete` → `system:dict:{create/update/delete}`。

**DictItem**：`create`/`update`/`delete` → `system:dict-item:{create/update/delete}`。

合计 **28 个被装饰的写方法**（与 28 个编码 1:1 对应；User 的 2 个自助方法免装饰）；所有 GET 接口仅受 `JwtAuthGuard` 保护。

---

## 4. Seed 数据、`PERMISSIONS` 常量、正则

### 4.1 正则放宽

`apps/api/src/modules/menu/services/menu.service.ts` → `validateTypeConstraints` 按钮分支：
```diff
- if (!/^[a-z]+:[a-z]+:[a-z]+$/.test(data.permission))
+ if (!/^[a-z]+(-[a-z]+)*(:[a-z]+(-[a-z]+)*){2}$/.test(data.permission))
```

### 4.2 Seed 数据 (`prisma/seed.ts`)

新增 25 条 `type:'button'` 的 `Menu` 行（现有 3 条 user 按钮 id 211/212/213）。每条挂在其所属模块菜单节点下（沿用现有按钮挂载模式）。完整集合 = 28：

- User：`:reset`、`:assign-role`、`:assign-position`、`:update-status`（4 新增；create/update/delete 已存在）
- Role：`:create`、`:update`、`:delete`、`:assign-permission`、`:data-scope`、`:update-status`（6 新增）
- Menu、Dept、Position、Dict、DictItem：各 `:create`/`:update`/`:delete`（15 新增）

**角色授权**：通过 `RoleMenu` 将全部 28 个按钮分配给 `super_admin`(id 1) 与 `admin`(id 2)，沿用现有模式。super_admin 仍由角色编码绕过（授权非依赖）；admin 需要授权才真正持有权限。

### 4.3 `PERMISSIONS` 常量 (`packages/shared/src/constants.ts`)

扩展至全 28 个，沿用现有 `MODULE_ACTION` 命名：

```typescript
export const PERMISSIONS = {
  USER_CREATE: 'system:user:create',
  USER_UPDATE: 'system:user:update',
  USER_DELETE: 'system:user:delete',
  USER_RESET: 'system:user:reset',
  USER_ASSIGN_ROLE: 'system:user:assign-role',
  USER_ASSIGN_POSITION: 'system:user:assign-position',
  USER_UPDATE_STATUS: 'system:user:update-status',
  ROLE_CREATE: 'system:role:create',
  ROLE_UPDATE: 'system:role:update',
  ROLE_DELETE: 'system:role:delete',
  ROLE_ASSIGN_PERMISSION: 'system:role:assign-permission',
  ROLE_DATA_SCOPE: 'system:role:data-scope',
  ROLE_UPDATE_STATUS: 'system:role:update-status',
  MENU_CREATE: 'system:menu:create',
  MENU_UPDATE: 'system:menu:update',
  MENU_DELETE: 'system:menu:delete',
  DEPT_CREATE: 'system:dept:create',
  DEPT_UPDATE: 'system:dept:update',
  DEPT_DELETE: 'system:dept:delete',
  POSITION_CREATE: 'system:position:create',
  POSITION_UPDATE: 'system:position:update',
  POSITION_DELETE: 'system:position:delete',
  DICT_CREATE: 'system:dict:create',
  DICT_UPDATE: 'system:dict:update',
  DICT_DELETE: 'system:dict:delete',
  DICT_ITEM_CREATE: 'system:dict-item:create',
  DICT_ITEM_UPDATE: 'system:dict-item:update',
  DICT_ITEM_DELETE: 'system:dict-item:delete',
} as const;
```

---

## 5. 前端设计 (Next.js)

### 5.1 角色编码修复（前端超管绕过前置）

- 后端 `login()` / `loginWithMfa()` 返回的 `user` 对象新增 `roles: string[]`（真实角色编码）。
- 前端 `completeLogin`（`app/(auth)/login/page.tsx`）将 `roles: []` 改为 `roles: data.user?.roles ?? []`。（`AuthProvider` 已通过 `/auth/me` 把真实 roles 带入 store。）

### 5.2 `usePermission` Hook (`lib/hooks/use-permission.ts`)

新建文件，确立 `hooks/` 目录：

```typescript
import { useAuthStore } from '@/lib/store/auth-store';
import { SUPER_ADMIN_ROLE } from '@sekiro/shared';

export function usePermission() {
  const permissions = useAuthStore((s) => s.permissions);
  const roles = useAuthStore((s) => s.user?.roles ?? []);
  const isSuperAdmin = roles.includes(SUPER_ADMIN_ROLE);
  return {
    isSuperAdmin,
    has: (code: string) => isSuperAdmin || permissions.includes(code),
    hasAny: (codes: string[]) => isSuperAdmin || codes.some((c) => permissions.includes(c)),
  };
}
```

超管短路逻辑与后端 guard 保持一致。

### 5.3 `<HasPermission>` 包裹组件 (`components/shared/has-permission.tsx`)

```tsx
import { usePermission } from '@/lib/hooks/use-permission';

export function HasPermission({ code, children }: { code: string; children: React.ReactNode }) {
  const { has } = usePermission();
  return has(code) ? <>{children}</> : null;
}
```

用法：`<HasPermission code={PERMISSIONS.USER_CREATE}><Button>新增</Button></HasPermission>`。对 `<Button>` 与 `<DropdownMenuItem>` 均适用（返回 `null` → 元素隐藏）。

### 5.4 空操作簇处理

当下拉菜单（如用户行操作的 `MoreHorizontal` 触发器）内所有子项均被隐藏时，触发器本身也应隐藏。页面以 `usePermission().hasAny([...])` 条件控制该触发器的渲染，避免出现一个点击后无内容的下拉。

---

## 6. 前端页面级按钮控制

每个写操作按钮以 `<HasPermission code={...}>` 包裹，或行内以 `usePermission().has(...)` 条件渲染：

| 页面 | 按钮 | 权限编码 |
| :--- | :--- | :--- |
| **User** | 新增 | `USER_CREATE` |
| | 行 编辑 | `USER_UPDATE` |
| | 行 ▾ 触发器 | `hasAny([USER_RESET, USER_ASSIGN_ROLE, USER_DELETE])` 时显示 |
| | ↳ 重置密码 | `USER_RESET` |
| | ↳ 分配角色 | `USER_ASSIGN_ROLE` |
| | ↳ 删除 | `USER_DELETE` |
| **Role** | 新增 | `ROLE_CREATE` |
| | 行 编辑 | `ROLE_UPDATE` |
| | 行 权限 | `ROLE_ASSIGN_PERMISSION` |
| | 行 删除 | `ROLE_DELETE` |
| **Menu** | 新增 / 行 新增子 | `MENU_CREATE` |
| | 行 编辑 | `MENU_UPDATE` |
| | 行 删除 | `MENU_DELETE` |
| **Dept** | 新增 / 行 新增子 | `DEPT_CREATE` |
| | 行 编辑 | `DEPT_UPDATE` |
| | 行 删除 | `DEPT_DELETE` |
| **Position** | 新增 | `POSITION_CREATE` |
| | 行 编辑 | `POSITION_UPDATE` |
| | 行 删除 | `POSITION_DELETE` |
| **Dict** | 类型 新增/编辑/删除 | `DICT_CREATE` / `DICT_UPDATE` / `DICT_DELETE` |
| | 字典项 新增/编辑/删除 | `DICT_ITEM_CREATE` / `DICT_ITEM_UPDATE` / `DICT_ITEM_DELETE` |

**导入/导出（User 页面）**：为无后端接口的占位按钮，暂不做权限控制（超范围）。

**有装饰器但前端暂无按钮的接口**：`user:assign-position`、`user:update-status`、`role:update-status`、`role:data-scope`——后端仍强制拦截（装饰器为权威）；待 UI 增加按钮时按相同编码控制。

---

## 7. 测试与边界情况

### 7.1 后端测试 (Vitest)

沿用现有 `__tests__/` 目录约定：

- `modules/auth/guards/__tests__/permission.guard.spec.ts`：
  - 无 `@RequiresPermissions` 元数据 → 放行；
  - `roles` 含 `super_admin` → 放行；
  - `permissions` 含目标编码 → 放行；
  - 不含目标编码 → 抛 `ForbiddenException`（403）；
  - 无 `req.user` → 抛 `UnauthorizedException`（401）。
- 扩展 `auth.service.spec.ts`：登录写入 Session 的 `permissions`/`roles`；`/auth/me` 回写 Session；登录响应 `user.roles` 返回真实编码。
- 扩展 `menu.service.spec.ts`：放宽后的正则接受 `assign-role`/`dict-item`，拒绝非法标识符。
- 可选 Controller 冒烟：被装饰写接口对无权限用户返回 403。

### 7.2 前端验证

前端无测试框架，不引入新框架（避免范围蔓延）。以以下方式验证：
- `pnpm --filter @sekiro/web typecheck`
- `pnpm --filter @sekiro/web lint`
- 手工冒烟：以无权限用户登录 → 确认按钮隐藏；以该用户身份直接调用写接口 → 403 toast。

### 7.3 边界情况

1. **Guard 执行顺序**：`@UseGuards(JwtAuthGuard, PermissionGuard)` 从左到右执行，`req.user` 先被填充。已记录。
2. **GET 接口**：共享类级 guard 但无 `@RequiresPermissions` → `PermissionGuard` 直接放行，无误拒。
3. **公共/自助路由**：login/refresh/health 无 `@UseGuards(JwtAuthGuard)` → 不受影响；profile/password 无装饰器 → 仅需登录。
4. **部署后旧 Session**：缺少新 `permissions`/`roles` 字段 → `PermissionGuard` 按 `[]` 处理（拒绝而非抛异常）。自动迁移：`AuthProvider` 在页面加载调用 `/auth/me`，重算并**回写 Session**（见 2.3），用户在下次页面加载即自动刷新；此前发起的写请求得 403 → 重试即可。
5. **`super_admin` 魔法字符串**：统一为 `SUPER_ADMIN_ROLE` 常量（`packages/shared/src/constants.ts`），后端 guard 与前端 hook 共用。
6. **403 处理**：`apiClient` 已对 `ResultCode.FORBIDDEN` 做“无权限访问” toast，无需新增 i18n。

### 7.4 验证命令

- `pnpm --filter @sekiro/api test`（vitest）
- `pnpm --filter @sekiro/api typecheck`
- `pnpm --filter @sekiro/web typecheck && pnpm --filter @sekiro/web lint`
- 重跑 seed：`pnpm --filter @sekiro/api exec prisma db seed`（或 `db:reset`）以应用 28 个按钮。

---

## 8. 范围与非目标

**范围内（Issue #35）：**
- 后端 Session 缓存权限 + `@RequiresPermissions` + `PermissionGuard` + 7 模块写接口装饰。
- 前端 `usePermission` Hook + `<HasPermission>` 包裹 + 6 大页面写按钮条件渲染。
- 正则放宽、28 个按钮 seed、`PERMISSIONS` 常量补全、登录响应补 `roles`。

**非目标（明确排除）：**
- 将 `JwtAuthGuard` + `PermissionGuard` 改为全局 guard + `@Public()` 重构（记录为未来可选清理）。
- 主动 Session 失效（权限变更实时联动）——接受过期直至 `/auth/me` 刷新。
- 前端引入测试框架。
- 路由级（页面级）权限守卫——本期仅按钮级；路由级仍由 `AuthProvider` 的 token 检查 + 侧边栏菜单可见性覆盖。
- 导入/导出等无后端接口的占位按钮。
