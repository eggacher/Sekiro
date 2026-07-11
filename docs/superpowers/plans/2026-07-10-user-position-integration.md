# Issue #31: 用户管理集成岗位实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在用户管理页面 `/system/user` 中展示岗位、在新增/编辑表单中分配岗位，打通用户与岗位模块。

**Architecture:** 后端 `UserRepository` 在 `findPage` / `findById` 中 `include` 岗位关联并映射 `positionIds`；前端 `UserPage` 加载岗位列表、渲染岗位列、在表单中复用 Checkbox 组选择岗位，保存时先调用用户保存接口、再调用已有的岗位分配接口。

**Tech Stack:** NestJS + Prisma + PostgreSQL + Next.js 14 + React + TypeScript + shadcn/ui + `@sekiro/shared`

## Global Constraints

- 所有跨进程数据结构必须使用 `@sekiro/shared` 类型（`User`、`Position`、`PageResult`）
- 后端接口返回 `ApiResponse<T>`，`code=0` 表示成功
- 分页接口入参 `page`/`pageSize`，出参 `PageResult<T>`
- 全局 `ValidationPipe` 配置为 `whitelist: true` + `forbidNonWhitelisted: true`：`POST/PUT /system/user` 的请求体只能包含 DTO 声明的字段
- 岗位选择器仅展示 `status === "enabled"` 的岗位
- 无岗位用户在列表中显示「未分配」

---

### Task 1: 后端 — UserRepository 查询返回 `positionIds`

**Files:**
- Modify: `apps/api/src/modules/user/repositories/user.repository.ts`
- Create: `apps/api/src/modules/user/__tests__/user.repository.positions.spec.ts`

**Interfaces:**
- Consumes: Prisma `User` model with `positions -> position` relation
- Produces: `findById` 与 `findPage` 返回的对象带 `positionIds: number[]` 与 `positionNames: string[]`

- [ ] **Step 1: 编写 findById 的 failing test**

```ts
// apps/api/src/modules/user/__tests__/user.repository.positions.spec.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { UserRepository } from "../repositories/user.repository";

describe("UserRepository Positions", () => {
  let repository: UserRepository;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      user: {
        findFirst: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
      },
    };
    repository = new UserRepository(prismaMock);
  });

  it("findById 返回 positionIds", async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: 1,
      username: "admin",
      positions: [
        { positionId: 10, position: { id: 10, name: "董事长" } },
        { positionId: 11, position: { id: 11, name: "总经理" } },
      ],
    });
    const result = await repository.findById(1);
    expect(result?.positionIds).toEqual([10, 11]);
  });

  it("findById 无岗位时返回空数组", async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: 1,
      username: "admin",
      positions: [],
    });
    const result = await repository.findById(1);
    expect(result?.positionIds).toEqual([]);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm --filter @sekiro/api test -- src/modules/user/__tests__/user.repository.positions.spec.ts`
Expected: FAIL，提示 `positionIds` 为 `undefined`

- [ ] **Step 3: 实现 findById 岗位映射**

```ts
// apps/api/src/modules/user/repositories/user.repository.ts
async findById(id: number) {
  const user = await this.prisma.user.findFirst({
    where: { id, deletedAt: null },
    include: { positions: { include: { position: true } } },
  });
  if (!user) return null;
  const { positions, ...rest } = user;
  return {
    ...rest,
    positionIds: positions.map((up) => up.positionId),
  };
}
```

- [ ] **Step 4: 运行 findById 测试**

Run: `pnpm --filter @sekiro/api test -- src/modules/user/__tests__/user.repository.positions.spec.ts`
Expected: PASS

- [ ] **Step 5: 编写 findPage 的 failing test**

Append to `apps/api/src/modules/user/__tests__/user.repository.positions.spec.ts`:

```ts
  it("findPage 映射 positionIds", async () => {
    prismaMock.user.count.mockResolvedValue(1);
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: 1,
        username: "admin",
        positions: [{ positionId: 10, position: { id: 10, name: "董事长" } }],
      },
    ]);
    const result = await repository.findPage(
      { page: 1, pageSize: 10 },
      { isAll: true, isSelf: false, userId: 1, deptIds: [] }
    );
    expect(result.list[0].positionIds).toEqual([10]);
  });
```

- [ ] **Step 6: 运行测试确认失败**

Run: `pnpm --filter @sekiro/api test -- src/modules/user/__tests__/user.repository.positions.spec.ts`
Expected: FAIL

- [ ] **Step 7: 实现 findPage 岗位映射**

```ts
// apps/api/src/modules/user/repositories/user.repository.ts
async findPage(query: QueryUserDto, scope: UserDataScope) {
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

  if (scope.isSelf) {
    where.id = scope.userId;
  } else if (!scope.isAll) {
    const allowedDepts = scope.deptIds;
    if (query.deptId) {
      where.deptId = allowedDepts.includes(Number(query.deptId))
        ? Number(query.deptId)
        : -1;
    } else {
      where.deptId = { in: allowedDepts };
    }
  } else if (query.deptId) {
    where.deptId = Number(query.deptId);
  }

  const page = Number(query.page) || 1;
  const pageSize = Number(query.pageSize) || 10;
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  const total = await this.prisma.user.count({ where });
  const rawList = await this.prisma.user.findMany({
    where,
    skip,
    take,
    orderBy: { createdAt: "desc" },
    include: { positions: { include: { position: true } } },
  });

  const list = rawList.map(({ positions, ...user }) => ({
    ...user,
    positionIds: positions.map((up) => up.positionId),
  }));

  return { list, total, page, pageSize };
}
```

- [ ] **Step 8: 运行 findPage 测试**

Run: `pnpm --filter @sekiro/api test -- src/modules/user/__tests__/user.repository.positions.spec.ts`
Expected: PASS

- [ ] **Step 9: 运行完整 API 测试套件**

Run: `pnpm --filter @sekiro/api test`
Expected: ALL PASS（当前基线 119/119）

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/modules/user/repositories/user.repository.ts
git add apps/api/src/modules/user/__tests__/user.repository.positions.spec.ts
git commit -m "feat(api): include positionIds in user queries"
```

---

### Task 2: 前端 — 加载岗位列表并展示岗位列

**Files:**
- Modify: `apps/web/app/(dashboard)/system/user/page.tsx`

**Interfaces:**
- Consumes: `GET /system/position?page=1&pageSize=1000` 返回 `PageResult<Position>`
- Consumes: `GET /system/user` 返回的用户对象现在带 `positionIds`
- Produces: `positions` state 传给 Task 3 的表单

- [ ] **Step 1: 导入 `Position` 类型**

修改 `@sekiro/shared` 的 import：

```ts
import type { User, Dept, Role, Position, PageResult } from "@sekiro/shared";
```

- [ ] **Step 2: 增加岗位状态与加载函数**

在 `const [roles, setRoles] = React.useState<Role[]>([]);` 之后添加：

```ts
const [positions, setPositions] = React.useState<Position[]>([]);
```

在 `fetchRoles` 之后添加：

```ts
const fetchPositions = async () => {
  try {
    const res = await apiClient.get<PageResult<Position>>(
      "/system/position?page=1&pageSize=1000"
    );
    setPositions((res.list || []).filter((p) => p.status === "enabled"));
  } catch (err: any) {
    toast.error(err.message || "加载岗位列表失败");
  }
};
```

在 `React.useEffect` 中增加 `fetchPositions();`：

```ts
React.useEffect(() => {
  fetchUsers();
  fetchDepts();
  fetchRoles();
  fetchPositions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

- [ ] **Step 3: 增加「岗位」列**

在 `columns` 的角色列之后、手机列之前插入：

```ts
{
  key: "positions",
  title: "岗位",
  render: (row) => (
    <div className="flex flex-wrap gap-1">
      {(row.positionIds || []).length > 0 ? (
        row.positionIds.map((id) => {
          const pos = positions.find((p) => p.id === id);
          return (
            <Badge key={id} variant="outline" className="font-normal">
              {pos ? pos.name : `岗位 ${id}`}
            </Badge>
          );
        })
      ) : (
        <span className="text-muted-foreground">未分配</span>
      )}
    </div>
  ),
},
```

- [ ] **Step 4: 将 `positions` 传给 `UserFormDialog`**

```tsx
<UserFormDialog
  open={formOpen}
  onOpenChange={setFormOpen}
  editing={editing}
  depts={depts}
  roles={roles}
  positions={positions}
  onSave={handleSave}
/>
```

- [ ] **Step 5: 更新 `UserFormDialog` props 类型与解构**

修改 `UserFormDialog` 函数参数解构：

```ts
function UserFormDialog({
  open,
  onOpenChange,
  editing,
  depts,
  roles,
  positions,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: User | null;
  depts: Dept[];
  roles: Role[];
  positions: Position[];
  onSave: (data: Partial<User>) => void;
}) {
```

- [ ] **Step 6: 运行 typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/(dashboard)/system/user/page.tsx
git commit -m "feat(web): load positions and show position column"
```

---

### Task 3: 前端 — 用户表单增加岗位多选

**Files:**
- Modify: `apps/web/app/(dashboard)/system/user/page.tsx`

**Interfaces:**
- Consumes: `positions: Position[]`（Task 2）
- Produces: `form.positionIds` 状态（Task 4 保存时使用）

- [ ] **Step 1: 初始化新用户的 `positionIds`**

在 `UserFormDialog` 的 `React.useEffect` 中修改 `setForm` 初始值：

```ts
setForm(
  editing ?? {
    status: "enabled",
    deptId: depts[0]?.id,
    roleIds: roles[0] ? [roles[0].id] : [],
    positionIds: [],
  }
);
```

- [ ] **Step 2: 增加 `togglePosition` 辅助函数**

在 `toggleRole` 函数之后添加：

```ts
const togglePosition = (positionId: number, checked: boolean) => {
  const current = form.positionIds ?? [];
  if (checked) {
    setForm({ ...form, positionIds: [...current, positionId] });
  } else {
    setForm({ ...form, positionIds: current.filter((id) => id !== positionId) });
  }
};
```

- [ ] **Step 3: 在表单中增加岗位 Checkbox 组**

在角色 Checkbox 组（`col-span-2`）之后插入：

```tsx
<div className="col-span-2 space-y-2">
  <Label>岗位</Label>
  <div className="flex flex-wrap gap-3 rounded-md border p-3">
    {positions.length === 0 ? (
      <span className="text-sm text-muted-foreground">暂无可选岗位</span>
    ) : (
      positions.map((p) => (
        <label key={p.id} className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={(form.positionIds ?? []).includes(p.id)}
            onCheckedChange={(checked) =>
              togglePosition(p.id, checked === true)
            }
          />
          {p.name}
        </label>
      ))
    )}
  </div>
</div>
```

- [ ] **Step 4: 运行 typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/(dashboard)/system/user/page.tsx
git commit -m "feat(web): add position multi-select to user form"
```

---

### Task 4: 前端 — 保存时顺序分配岗位

**Files:**
- Modify: `apps/web/app/(dashboard)/system/user/page.tsx`

**Interfaces:**
- Consumes: `form.positionIds`（Task 3）
- Produces: 顺序调用 `POST/PUT /system/user` 后接 `PUT /system/user/:id/positions`

- [ ] **Step 1: 修改 `handleSave` 分离用户字段与岗位字段**

替换 `handleSave` 为：

```ts
const handleSave = async (data: Partial<User>) => {
  try {
    const { positionIds, ...userData } = data;

    const userPayload = editing
      ? {
          nickname: userData.nickname,
          email: userData.email,
          phone: userData.phone,
          avatar: userData.avatar,
          deptId: userData.deptId,
        }
      : {
          username: userData.username,
          nickname: userData.nickname,
          email: userData.email,
          phone: userData.phone,
          avatar: userData.avatar,
          deptId: userData.deptId,
        };

    if (editing) {
      await apiClient.put<User>(`/system/user/${editing.id}`, userPayload);
      await apiClient.put(`/system/user/${editing.id}/positions`, {
        positionIds,
      });
      toast.success("用户更新成功");
    } else {
      const created = await apiClient.post<User>("/system/user", userPayload);
      await apiClient.put(`/system/user/${created.id}/positions`, {
        positionIds,
      });
      toast.success("用户新增成功");
    }

    setFormOpen(false);
    setEditing(null);
    await fetchUsers();
  } catch (err: any) {
    toast.error(err.message || "保存用户失败");
  }
};
```

- [ ] **Step 2: 运行 typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/(dashboard)/system/user/page.tsx
git commit -m "feat(web): assign positions on user create/update"
```

---

### Task 5: 最终验证与文档同步

**Files:**
- Modify: `.superpowers/sdd/progress.md`
- Modify: `.superpowers/sdd/GITHUB_ISSUES_STATUS.md`

- [ ] **Step 1: 运行全量验证**

```bash
pnpm typecheck
pnpm lint
pnpm --filter @sekiro/api test
```

Expected: 全部通过

- [ ] **Step 2: 更新 `progress.md`**

在 `.superpowers/sdd/progress.md` 末尾追加：

```markdown
---

# Story #31: 在用户管理中查看和分配岗位 — 执行进度

## 计划信息
- **规范文件**：`docs/superpowers/specs/2026-07-10-user-position-integration-design.md`
- **实施计划**：`docs/superpowers/plans/2026-07-10-user-position-integration.md`
- **完成时间**：2026-07-10

## 任务清单
- [x] Task 1: 后端 UserRepository 返回 positionIds
- [x] Task 2: 前端加载岗位并展示列表岗位列
- [x] Task 3: 前端用户表单增加岗位多选
- [x] Task 4: 前端保存流程顺序分配岗位
- [x] Task 5: 全量验证与文档更新

## 完成记录

### Task 1: 后端 UserRepository 岗位字段
- **相关文件**：`apps/api/src/modules/user/repositories/user.repository.ts`
- **审阅**: ✅ `findPage` 与 `findById` 返回 `positionIds`

### Task 2-4: 前端用户管理页面
- **相关文件**：`apps/web/app/(dashboard)/system/user/page.tsx`
- **审阅**: ✅ 列表岗位列、表单岗位多选、保存分配岗位均实现

### Final: 全量代码 review
- **验证结果**: ✅ `pnpm typecheck` 通过、`pnpm lint` 通过、`pnpm --filter @sekiro/api test` 全部通过
```

- [ ] **Step 3: 更新 GitHub Issues 状态**

在 `.superpowers/sdd/GITHUB_ISSUES_STATUS.md` 合适位置追加 Issue #31 完成记录，状态标记为 ✅ Closed。

- [ ] **Step 4: Commit**

```bash
git add .superpowers/sdd/progress.md
git add .superpowers/sdd/GITHUB_ISSUES_STATUS.md
git commit -m "docs(sync): update progress and issue status for Story #31"
```

---

## Self-Review Checklist

- [x] **Spec coverage**: AC1-AC4 均能在任务中找到对应实现
- [x] **Placeholder scan**: 无 TBD/TODO/模糊步骤
- [x] **Type consistency**: `positionIds: number[]`、`Position` 来自 `@sekiro/shared`，请求体字段与 DTO 一致
- [x] **Validation constraint**: `handleSave` 显式分离 `positionIds`，构造只含 DTO 字段的 `userPayload`，避免 `forbidNonWhitelisted` 报错
