# CrudTable 通用表格模糊搜索设计方案

本文档旨在设计一种方案，使通用表格组件 [crud-table.tsx](file://<PROJECT_ROOT>/apps/web/components/shared/crud-table.tsx) 在客户端过滤数据时，支持对输入框类型（`input`）的检索项进行模糊搜索，解决用户管理等页面精确匹配导致体验不佳的问题。

## 用户评审要点

> [!IMPORTANT]
> 1. 本变更为客户端级变更，直接影响所有使用 `CrudTable` 的搜索输入项。
> 2. 下拉菜单（`type === "select"`）如状态过滤，将继续保持精确比对规则，不受影响。

## 设计细节

对通用组件 [crud-table.tsx](file://<PROJECT_ROOT>/apps/web/components/shared/crud-table.tsx) 的过滤逻辑进行修改。

### 1. 过滤判断差异化
在 `filtered` 计算属性中，将原来的单一 `===` 精确匹配替换为基于检索字段类型的分支判断：
- **Select 类型（下拉框）**：保持 `row[key] === value` 的精确匹配。
- **Input 类型或未定义（文本输入框）**：改为不区分大小写的包含匹配 `String(row[key] ?? "").toLowerCase().includes(value.toLowerCase())`。

### 2. 依赖补充
在 `useMemo` 依赖项中，需要添加 `searchFields` 依赖项，以完全符合 React 的声明式渲染依赖原则。

## 验证与测试方案

### 自动化验证
由于该组件目前主要由前端渲染，我们将验证：
- `pnpm typecheck` 前端无 TypeScript 编译错误。

### 手动验证
1. 打开用户管理页面，在用户名搜索框中输入 `ad`，观察是否能正确模糊搜索出 `admin`。
2. 在手机号搜索框中输入手机号的中间几位，观察是否能正确模糊过滤出对应用户。
3. 测试状态下拉框（如“启用”），验证下拉选择精确过滤依然符合旧规则。
