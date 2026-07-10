# Issue #31：用户管理集成岗位设计

> **关联 Issue**：#31
> **日期**：2026-07-10
> **作者**：Kimi Code
> **状态**：待实现

---

## 1. 背景与目标

系统已具备岗位（Position）基础 CRUD 与 `PUT /api/system/user/:id/positions` 接口，但用户管理页面 `/system/user` 尚未与岗位模块打通。本设计目标：

1. 用户列表展示岗位信息
2. 新增/编辑用户时在表单中分配岗位
3. 用户详情能查看已分配岗位

---

## 2. 范围

### 2.1 包含

- 后端 `UserRepository` 列表/详情查询返回 `positionIds` 与 `positionNames`
- 前端用户列表新增「岗位」列
- 前端新增/编辑用户表单增加岗位多选
- 前端保存时顺序调用用户保存接口 + 岗位分配接口

### 2.2 不包含

- 修改 `CreateUserDto` / `UpdateUserDto` 以在单接口中原子保存岗位（采用顺序双调用方案）
- 新增独立的「分配岗位」弹窗（岗位分配内聚在新增/编辑表单中）
- 岗位管理模块本身的 CRUD 变更

---

## 3. 方案选择

### 3.1 推荐方案：方案 A（顺序双调用）

后端仅增强查询返回岗位字段，复用现有 `PUT /system/user/:id/positions` 接口；前端在保存成功后继续调用岗位分配接口。

**理由**：
- 严格贴合 Issue #31 验收标准 AC2（创建用户后调用岗位分配接口）
- 后端改动最小，避免引入 DTO 变更与事务耦合
- 复用现有接口与权限校验

### 3.2 备选方案

| 方案 | 说明 | 不选原因 |
| --- | --- | --- |
| B：后端原子化 | DTO 增加 `positionIds`，`create`/`update` 事务中同时保存用户与岗位 | 偏离 AC2 明确要求 |
| C：独立分配弹窗 | 仿「分配角色」新增岗位分配弹窗 | 不符合 AC2/AC3 要求在新增/编辑表单中分配岗位 |

---

## 4. 架构与数据流

### 4.1 后端

```
GET /system/user         -> UserService.getPage -> UserRepository.findPage
GET /system/user/:id     -> UserService.getDetail -> UserRepository.findById
PUT /system/user/:id/positions  -> UserService.assignPositions (已有)
```

`UserRepository.findPage` 与 `findById` 通过 Prisma `include: { positions: { include: { position: true } } }` 加载岗位关联，输出字段增加：

- `positionIds: number[]`
- `positionNames: string[]`

### 4.2 前端

```
UserPage
├── fetchUsers()      // 增强后返回 positionIds/positionNames
├── fetchPositions()  // GET /system/position?pageSize=1000
├── columns           // 新增「岗位」列
├── UserFormDialog    // 增加岗位多选
└── handleSave()      // 顺序调用保存 + 分配岗位
```

### 4.3 保存流程

**创建用户**：
1. `POST /system/user` 创建用户
2. 成功后 `PUT /system/user/:id/positions` 分配岗位
3. 成功后 `fetchUsers()` 刷新列表

**编辑用户**：
1. `PUT /system/user/:id` 更新用户
2. 成功后 `PUT /system/user/:id/positions` 分配岗位
3. 成功后 `fetchUsers()` 刷新列表

---

## 5. 接口变更

### 5.1 响应字段增强

`GET /system/user` 与 `GET /system/user/:id` 的 `data` 中用户对象增加：

```ts
{
  positionIds?: number[];
  positionNames?: string[];
}
```

无岗位时返回空数组，前端显示「未分配」。

### 5.2 不变更

- `POST /system/user`：不接收 `positionIds`
- `PUT /system/user/:id`：不接收 `positionIds`
- `PUT /system/user/:id/positions`：保持 `{ positionIds: number[] }`

---

## 6. 前端组件变更

### 6.1 `apps/web/app/(dashboard)/system/user/page.tsx`

- 新增 `positions` state
- 新增 `fetchPositions()`
- `columns` 增加「岗位」列
- `UserFormDialog` props 增加 `positions: Position[]`
- `UserFormDialog` 表单增加岗位多选区域
- `handleSave` 拆分保存与岗位分配两步

### 6.2 岗位选择交互

采用与现有角色选择一致的 Checkbox 组形式：

```tsx
<div className="col-span-2 flex flex-wrap gap-3 rounded-md border p-3">
  {positions.map((p) => (
    <label key={p.id} className="flex items-center gap-2 text-sm">
      <Checkbox
        checked={(form.positionIds ?? []).includes(p.id)}
        onCheckedChange={(checked) => togglePosition(p.id, checked === true)}
      />
      {p.name}
    </label>
  ))}
</div>
```

仅展示 `status === "enabled"` 的岗位。

---

## 7. 错误处理

| 场景 | 处理 |
| --- | --- |
| 用户保存失败 | toast 错误，终止，不调用岗位分配 |
| 用户保存成功但岗位分配失败 | toast 错误；用户已保存，岗位未更新；用户可再次编辑重试 |
| 岗位列表加载失败 | toast 错误，表单中岗位选择区显示加载失败提示 |

---

## 8. 测试策略

### 8.1 后端测试

- 补充 `UserRepository` 测试：
  - `findPage` 返回包含 `positionIds` 与 `positionNames`
  - `findById` 返回包含 `positionIds` 与 `positionNames`
  - 无岗位用户返回空数组

### 8.2 前端测试

- 以手动验证为主
- 必须保证 `pnpm typecheck` 与 `pnpm lint` 通过
- 验证场景：
  - 列表展示岗位名称
  - 新增用户时分配岗位
  - 编辑用户时修改岗位
  - 无岗位用户显示「未分配」

---

## 9. 验收标准映射

| AC | 实现方式 |
| --- | --- |
| AC1：用户列表展示岗位 | 后端返回 `positionNames`，前端新增列 |
| AC2：新增用户时分配岗位 | 表单中岗位多选；保存时先创建用户再调用岗位分配接口 |
| AC3：编辑用户时修改岗位 | 编辑表单回填并更新；保存时先更新用户再调用岗位分配接口 |
| AC4：后端接口验证 | 复用并验证 `PUT /system/user/:id/positions` |

---

## 10. 风险评估

| 风险 | 缓解 |
| --- | --- |
| 顺序调用可能导致用户与岗位状态不一致 | 岗位分配失败时明确提示，允许用户再次编辑 |
| 岗位数据量大时 Checkbox 组占用空间大 | 当前岗位数量少，采用 Checkbox 组；若未来增长可替换为 MultiSelect |

---

## 11. 后续可优化

- 将岗位/角色选择抽取为通用 `MultiCheckGroup` 组件
- 当岗位数量较多时，改用 `MultiSelect` 或 `Command` 组合框
