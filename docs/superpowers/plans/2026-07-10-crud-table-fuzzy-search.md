# CrudTable 通用表格模糊搜索实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修改 `CrudTable` 前端通用组件，为文本输入类型（`input`）的检索项提供模糊包含查询（Case-insensitive partial match）支持。

**Architecture:**
修改 [crud-table.tsx](file:///Users/zero/projects/Sekiro/apps/web/components/shared/crud-table.tsx) 里的客户端数据过滤邏辑 (`filtered` 计算变量)，通过判断当前筛选条件对应的配置类型是不是 `select`，来区分精确匹配与模糊包含匹配。

**Tech Stack:** React, Next.js, TypeScript

## Global Constraints
- 所有操作必须在 `feature/crud-table-fuzzy-search` 工作区分支下进行。
- 精确匹配与模糊过滤的分支识别，应当通过 `searchFields` 的 `type === "select"` 进行智能路由。
- 文本模糊匹配需要不区分大小写，且使用标准的 `.includes(...)` 行为。

---

### Task 1: 修改 CrudTable 组件过滤逻辑

**Files:**
- Modify: `apps/web/components/shared/crud-table.tsx`

**Interfaces:**
- Consumes: searchFields, filters
- Produces: 客户端过滤后的表格列表数据 `filtered`

- [ ] **Step 1: 修改 `apps/web/components/shared/crud-table.tsx` 过滤段落**

修改 `filtered` 计算部分（约 85-89 行左右），对 `filters` 遍历执行的匹配比对：
```typescript
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "all") {
        const field = searchFields.find((f) => f.key === key);
        const isSelect = field?.type === "select";
        if (isSelect) {
          list = list.filter((row) => String((row as Record<string, unknown>)[key]) === value);
        } else {
          list = list.filter((row) => {
            const val = (row as Record<string, unknown>)[key];
            return String(val ?? "").toLowerCase().includes(value.toLowerCase());
          });
        }
      }
    });
```

同时，将 `searchFields` 添加到该 `useMemo` 的依赖项数组末尾：
```typescript
  }, [data, keyword, filters, searchFields]);
```

- [ ] **Step 2: 运行类型检查验证是否有 TypeScript 异常**

Run: `pnpm typecheck`
Expected: 运行全部通过，没有任何报错。

- [ ] **Step 3: 手动启动验证**

1. 启动服务：`pnpm dev`
2. 打开浏览器登录系统，进入用户管理界面：
   - 在用户名输入框输入 `ad`：应能够正确过滤出用户名中包含 `ad` 的用户（如 `admin`）。
   - 在手机号输入框输入手机号中间几位：应能正确模糊筛选用户。
   - 切换状态下拉选择框：应依然保持完全对齐的精确模式。

- [ ] **Step 4: 提交代码**

```bash
git add apps/web/components/shared/crud-table.tsx
git commit -m "feat(web): enable fuzzy search in CrudTable for input fields"
```
