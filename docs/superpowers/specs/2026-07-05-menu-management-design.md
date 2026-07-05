# Story #9: Menu 菜单管理模块设计规格

**日期**：2026-07-05
**模块**：`apps/api/src/modules/menu/`
**对应 Issue**：GitHub #9
**SPEC 参考**：§3.7 Menu 领域模型、§4.5 菜单 CRUD、§5.1 校验规则、§5.3 INV-4/INV-5

---

## 1. 领域模型

Menu 是一棵自关联树，通过 `parentId` 组织。**三种节点类型**共享同一张表（方案 A 单一类）：

| type | 含义 | 约束 |
|------|------|------|
| `directory` | 目录（容器） | `path` 必填，`component` 可空，`permission` 禁填 |
| `menu` | 页面菜单 | `path` 必填，`component` 必填，`permission` 可空 |
| `button` | 按钮权限 | `path` 禁填，`component` 禁填，`permission` 必填（格式 `^[a-z]+:[a-z]+:[a-z]+$`） |

**已有 Prisma Schema**（`apps/api/prisma/schema.prisma:55-77`）：

```prisma
model Menu {
  id         Int      @id @default(autoincrement())
  parentId   Int?     @map("parent_id")
  title      String   @db.VarChar(32)
  type       String   @db.VarChar(16)     // directory | menu | button
  path       String?  @db.VarChar(128)
  component  String?  @db.VarChar(128)
  icon       String?  @db.VarChar(64)
  permission String?  @db.VarChar(128)
  sort       Int      @default(0)
  visible    Boolean  @default(true)
  cache      Boolean  @default(true)
  status     String   @default("enabled") @db.VarChar(16)
  // ... timestamps, relations
}
```

**已有 Seed 数据**（16 条，含 3 个 button 类型）：
- 根节点：工作台(1)、系统管理(2)、系统监控(3)
- 子菜单：用户管理(21)、角色管理(22)、菜单管理(23) 等
- 按钮权限：新增(211)、编辑(212)、删除(213)

---

## 2. API 接口设计

| 方法 | 路径 | 说明 | 返回 |
|------|------|------|------|
| `GET` | `/system/menu` | 获取菜单树（全量） | `MenuNode[]`（嵌套 children） |
| `GET` | `/system/menu/:id` | 获取单个菜单详情 | `Menu` |
| `POST` | `/system/menu` | 新建菜单 | `Menu` |
| `PUT` | `/system/menu/:id` | 修改菜单 | `Menu` |
| `DELETE` | `/system/menu/:id` | 删除菜单 | `null` |

所有接口均需 `JwtAuthGuard` 鉴权。

### 2.1 GET `/system/menu` — 菜单树

- 查询**全部**未删除菜单，按 `sort` 升序排序
- 在 Service 层递归构建树形结构返回
- **不分页**（菜单数据量有限，通常 < 200 条）
- 支持可选 `?status=enabled` 筛选

### 2.2 POST `/system/menu` — 新建

**DTO 校验规则（CreateMenuDto）**：

| 字段 | 类型 | 规则 |
|------|------|------|
| `parentId` | `number?` | 可空（根节点），非空时必须是已存在的有效菜单 ID |
| `title` | `string` | 必填，1-32 字符 |
| `type` | `string` | 必填，枚举 `directory` / `menu` / `button` |
| `path` | `string?` | `type ≠ button` 时必填，以 `/` 开头 |
| `component` | `string?` | `type = menu` 时必填 |
| `icon` | `string?` | 可空 |
| `permission` | `string?` | `type = button` 时必填，格式 `^[a-z]+:[a-z]+:[a-z]+$` |
| `sort` | `number` | 可选，默认 0，≥ 0 |
| `visible` | `boolean` | 可选，默认 true |
| `cache` | `boolean` | 可选，默认 true |
| `status` | `string` | 可选，默认 `enabled` |

> **注意**：`path`/`component`/`permission` 的条件必填校验无法纯靠 `class-validator` 装饰器实现，需在 **Service 层**手动校验（或使用 `@ValidateIf`）。

### 2.3 PUT `/system/menu/:id` — 修改

**DTO 校验规则（UpdateMenuDto）**：与 CreateMenuDto 基本相同，但不含 `type`（类型不可修改）。

### 2.4 DELETE `/system/menu/:id` — 删除

**业务规则**：
- **INV-5**：若该菜单有子节点，禁止删除（返回 422）
- 删除时同时清理 `role_menu` 关联记录
- 使用事务保证原子性

---

## 3. 安全不变量

| 编号 | 不变量 | 守护实现 |
|------|--------|---------|
| **INV-4** | 菜单树无环 | Service 层 `validateNoCycle(id, parentId)`：从 parentId 向上遍历祖先链，若遇到 id 则抛出 `UnprocessableEntityException` |
| **INV-5** | 删除非空目录需先处理子节点 | Service 层 `delete(id)` 检查 `children.count > 0` |
| **INV-3** | 菜单可见性 = 角色菜单并集 ∩ 菜单启用集 | 已在 `auth.service.ts` 中实现 |

### 3.1 环路检测算法

```typescript
async validateNoCycle(menuId: number, newParentId: number | null): Promise<void> {
  if (newParentId === null) return;  // 设为根节点，无环
  if (newParentId === menuId) throw; // 直接自引用

  let currentId: number | null = newParentId;
  const visited = new Set<number>();

  while (currentId !== null) {
    if (currentId === menuId) {
      throw new UnprocessableEntityException("不能将菜单移动到自己的子节点下，会形成环路");
    }
    if (visited.has(currentId)) break; // 已有环（理论上不应出现）
    visited.add(currentId);

    const parent = await this.menuRepo.findById(currentId);
    currentId = parent?.parentId ?? null;
  }
}
```

---

## 4. 分层架构

与 User/Role 模块完全对称：

```
MenuController → MenuService → MenuRepository
     ↓               ↓              ↓
  路由/DTO        业务规则       Prisma 数据操作
```

### 4.1 MenuRepository

| 方法 | 说明 |
|------|------|
| `findAll(status?)` | 查询全部菜单（可选状态过滤） |
| `findById(id)` | 按 ID 查询 |
| `countChildren(id)` | 统计直接子节点数 |
| `create(data)` | 创建菜单 |
| `update(id, data)` | 更新菜单 |
| `delete(id)` | 删除菜单（事务：删记录 + 清 roleMenu） |

### 4.2 MenuService

| 方法 | 说明 |
|------|------|
| `getTree(status?)` | 查询 + 构建树 |
| `getDetail(id)` | 查询单条 |
| `create(dto)` | 条件校验 + parentId 存在性检查 + 创建 |
| `update(id, dto)` | 条件校验 + 环路检测 (INV-4) + 更新 |
| `delete(id)` | 子节点检查 (INV-5) + 删除 |
| `validateNoCycle(id, parentId)` | 环路检测（私有） |
| `validateTypeConstraints(type, dto)` | 类型约束校验（私有） |

### 4.3 MenuController

标准 REST 映射，路由前缀 `/system/menu`，全部需要 `JwtAuthGuard`。

---

## 5. 条件校验逻辑 `validateTypeConstraints`

由于 Menu 的三种类型对字段有不同的必填要求，这部分在 Service 层统一处理：

```typescript
private validateTypeConstraints(type: string, dto: any): void {
  switch (type) {
    case 'directory':
      if (!dto.path) throw new UnprocessableEntityException("目录类型必须填写路径");
      break;
    case 'menu':
      if (!dto.path) throw new UnprocessableEntityException("菜单类型必须填写路径");
      if (!dto.component) throw new UnprocessableEntityException("菜单类型必须填写组件路径");
      break;
    case 'button':
      if (!dto.permission) throw new UnprocessableEntityException("按钮类型必须填写权限标识");
      if (!/^[a-z]+:[a-z]+:[a-z]+$/.test(dto.permission)) {
        throw new UnprocessableEntityException("权限标识格式必须为 module:resource:action");
      }
      break;
    default:
      throw new UnprocessableEntityException("菜单类型必须为 directory/menu/button");
  }
}
```

---

## 6. 与已有代码的关系

### 6.1 复用 AuthService 的 buildTree

`auth.service.ts` 已有一个 `buildTree` 方法用于登录时构建用户菜单树。Menu 模块将拥有自己的树构建逻辑（在 MenuService 中），两者独立——Auth 的 `buildTree` 只针对用户可见菜单，Menu 的 `getTree` 返回全量管理视图。

### 6.2 RoleModule 已实现菜单分配

`PUT /system/role/:id/menus` 已在 Story #8 中实现（RoleRepository.assignMenus），Menu 模块不需要重复此功能。

---

## 7. 单元测试覆盖

| 测试场景 | 预期 |
|----------|------|
| 创建 directory 类型但未填 path | 抛出 422 |
| 创建 button 类型但未填 permission | 抛出 422 |
| 创建 button 类型 permission 格式错 | 抛出 422 |
| 修改 parentId 导致环路 | 抛出 422 (INV-4) |
| 删除有子节点的菜单 | 抛出 422 (INV-5) |
| 菜单不存在时修改/删除 | 抛出 404 |
| 正常创建菜单 | 成功返回 |
| 查询树结构 | 返回嵌套 children |
