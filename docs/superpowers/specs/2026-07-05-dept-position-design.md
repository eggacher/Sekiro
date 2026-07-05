# Story #17: 部门与岗位管理设计规格

**日期**：2026-07-05
**模块**：`apps/api/src/modules/dept/`
**对应 Issue**：GitHub #17
**SPEC 参考**：§4.5 部门/岗位 CRUD、§5.1 校验规则、§5.3 INV-4/INV-5

---

## 1. 领域模型与数据库结构

本模块包含两个子领域实体：**部门 (Dept)** 和 **岗位 (Position)**。

### 1.1 部门 (Dept) - 自关联树形

部门是一棵自关联树，支持多级层级结构，支持软删除。

- **Prisma Schema**：
  ```prisma
  model Dept {
    id        Int       @id @default(autoincrement())
    parentId  Int?      @map("parent_id")
    name      String    @db.VarChar(32)
    leader    String?   @db.VarChar(32)
    phone     String?   @db.VarChar(20)
    sort      Int       @default(0)
    status    String    @default("enabled") @db.VarChar(16)
    createdAt DateTime  @default(now()) @map("created_at")
    updatedAt DateTime  @updatedAt @map("updated_at")
    deletedAt DateTime? @map("deleted_at")

    parent   Dept?      @relation("DeptTree", fields: [parentId], references: [id])
    children Dept[]     @relation("DeptTree")
    users    User[]     @relation("UserDept")
    roles    RoleDept[]

    @@index([parentId])
    @@map("dept")
  }
  ```

### 1.2 岗位 (Position) - 扁平结构

岗位用于定义用户的职位（如项目经理、技术总监等），通过 `UserPosition` 中间表与用户多对多关联。

- **Prisma Schema**：
  ```prisma
  model Position {
    id        Int       @id @default(autoincrement())
    name      String    @unique @db.VarChar(32)
    code      String    @unique @db.VarChar(64)
    sort      Int       @default(0)
    status    String    @default("enabled") @db.VarChar(16)
    createdAt DateTime  @default(now()) @map("created_at")
    updatedAt DateTime  @updatedAt @map("updated_at")
    deletedAt DateTime? @map("deleted_at")

    users UserPosition[]

    @@map("position")
  }
  ```

---

## 2. API 接口设计

### 2.1 部门管理 API (`/system/dept`)

| 方法 | 路径 | 说明 | 返回 |
|------|------|------|------|
| `GET` | `/system/dept` | 获取部门树（全量，按 sort 排序） | `DeptNode[]` |
| `GET` | `/system/dept/:id` | 获取部门详情 | `Dept` |
| `POST` | `/system/dept` | 新建部门 | `Dept` |
| `PUT` | `/system/dept/:id` | 修改部门 | `Dept` |
| `DELETE` | `/system/dept/:id` | 删除部门（软删除，带保护） | `null` |

#### DTO 验证（CreateDeptDto / UpdateDeptDto）：
- `name`：必填，1-32 字符。
- `parentId`：可选，非空时必须是已存在部门 ID。
- `phone`：可选，非空时格式校验 `^\d{11}$`。
- `status`：可选，`enabled` / `disabled`。
- `sort`：可选，默认 0。

### 2.2 岗位管理 API (`/system/position`)

| 方法 | 路径 | 说明 | 返回 |
|------|------|------|------|
| `GET` | `/system/position` | 分页查询岗位列表 | `{ list: Position[], total: number }` |
| `GET` | `/system/position/:id` | 获取岗位详情 | `Position` |
| `POST` | `/system/position` | 新建岗位 | `Position` |
| `PUT` | `/system/position/:id` | 修改岗位 | `Position` |
| `DELETE` | `/system/position/:id` | 删除岗位（软删除，带保护） | `null` |

#### DTO 验证（CreatePositionDto / UpdatePositionDto）：
- `name`：必填，1-32 字符，全库唯一。
- `code`：必填，格式 `^[a-z][a-z0-9_]*$`，全库唯一。
- `status`：可选，`enabled` / `disabled`。
- `sort`：可选，默认 0。

---

## 3. 安全守卫与不变量

### 3.1 部门不变量 (Dept Invariants)
*   **INV-4 环路检测**：修改 `parentId` 时，必须确保不能将部门移动到其自身或子孙节点下。
*   **INV-5 删除非空保护**：执行软删除前，必须确认该部门下：
    - 没有未删除的子部门（`deletedAt: null`）。
    - 没有与之关联的活跃用户（`deletedAt: null`）。
*   **关联清理**：删除时，在同一事务中删除相关的 `RoleDept` 关联记录。

### 3.2 岗位不变量 (Position Invariants)
*   **编码/名称唯一性**：`code` 与 `name` 全库唯一（仅比对未被软删除的记录）。
*   **删除非空保护**：删除时，必须确认当前岗位没有分配给任何活跃用户（`user: { deletedAt: null }`）。
*   **关联清理**：删除时，在同一事务中清理 `UserPosition` 中间表关联。

---

## 4. 目录结构与分层架构

我们将部门与岗位合并到同一个 NestJS 模块中：

```
apps/api/src/modules/dept/
├── dtos/
│   ├── create-dept.dto.ts
│   ├── update-dept.dto.ts
│   ├── query-dept.dto.ts
│   ├── create-position.dto.ts
│   ├── update-position.dto.ts
│   ├── query-position.dto.ts
│   └── index.ts
├── repositories/
│   ├── dept.repository.ts
│   └── position.repository.ts
├── services/
│   ├── dept.service.ts
│   └── position.service.ts
├── dept.controller.ts
├── position.controller.ts
├── dept.module.ts
└── index.ts
```

---

## 5. 关键业务逻辑伪代码

### 5.1 部门环路检测

```typescript
async validateNoCycle(deptId: number, newParentId: number | null): Promise<void> {
  if (newParentId === null) return;
  if (newParentId === deptId) throw new UnprocessableEntityException("不能移动到自己本身");

  let currentId: number | null = newParentId;
  const visited = new Set<number>();

  while (currentId !== null) {
    if (currentId === deptId) {
      throw new UnprocessableEntityException("不能将部门移动到自己的子节点下");
    }
    if (visited.has(currentId)) break;
    visited.add(currentId);

    const parent = await this.deptRepo.findById(currentId);
    currentId = parent?.parentId ?? null;
  }
}
```

### 5.2 部门删除校验

```typescript
async delete(id: number) {
  const dept = await this.deptRepo.findById(id);
  if (!dept) throw new NotFoundException();

  // 1. 检查子部门
  const childCount = await this.deptRepo.countActiveChildren(id);
  if (childCount > 0) throw new UnprocessableEntityException("该部门下有子部门");

  // 2. 检查关联用户
  const userCount = await this.deptRepo.countActiveUsers(id);
  if (userCount > 0) throw new UnprocessableEntityException("该部门下有分配用户");

  return this.deptRepo.softDelete(id);
}
```

### 5.3 岗位删除校验

```typescript
async delete(id: number) {
  const position = await this.positionRepo.findById(id);
  if (!position) throw new NotFoundException();

  // 检查是否有活跃用户分配了该岗位
  const userCount = await this.positionRepo.countActiveUsers(id);
  if (userCount > 0) throw new UnprocessableEntityException("该岗位下有分配用户");

  return this.positionRepo.softDelete(id);
}
```

---

## 6. 测试用例规划 (TDD)

### 6.1 部门管理测试
- 新建部门时，parentId 不存在抛出 404。
- 新增部门且 phone 格式错误抛出 422。
- 环路检测：将父部门移动到子部门下方抛出 422。
- 删除部门时，有未删除子部门抛出 422。
- 删除部门时，有关联活跃用户抛出 422。
- 正常删除部门，成功清理 `RoleDept` 关联。

### 6.2 岗位管理测试
- 创建岗位时，已存在相同 name/code 的岗位抛出 422。
- 创建岗位时，code 格式错误（如包含大写或特殊字符）抛出 422。
- 删除岗位时，有活跃用户分配了该岗位抛出 422。
- 正常删除岗位，成功清理 `UserPosition` 关联。
