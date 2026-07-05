# Task 3: 完整 Seed 数据填充 — 任务简述

## 概述

修改 `apps/api/prisma/seed.ts`，填充完整的种子数据常量和 `main()` 函数实现，使脚本能够一次性插入 105+ 示例数据到数据库。

## 输入

- 当前 seed.ts：已有框架、bcrypt 工具函数、12 个 TODO 占位符
- 设计文档数据规格：部门（10）、岗位（6）、字典（4 种 9 项）、用户（12）、角色（7）、菜单（16）、日志（22）等
- 全局约束：超管密码固定 `admin123`，其他用户随机 bcrypt；支持重复执行

## 输出

修改后的 `apps/api/prisma/seed.ts`，包含：
1. **数据常量定义**（在 `main()` 函数前）：deptData、positionData、dictTypeData、dictItemData、menuData、roleData、userData、loginLogData、operationLogData
2. **完整的 main() 函数**：按依赖顺序逐表清空和插入，打印进度和密码表
3. **验证通过**：TypeScript 检查无误、执行成功、可重复运行

## 详细步骤

### Step 1: 定义数据常量

在 `main()` 函数前加入数据常量定义。参照设计文档的完整数据规格（详见计划文件 Task 3 Step 1 的代码块）。

数据包括：
- **部门树**（deptData，10 条）：Sekiro 科技（100）→ 研发/财务/运营/市场/客服/人事
- **岗位**（positionData，6 条）：董事长、项目经理、技术总监、高级工程师、工程师、实习生
- **字典**（dictTypeData + dictItemData）：4 种类型、9 项数据
- **用户**（userData，12 条）：admin + 11 普通用户，关联各部门
- **角色**（roleData，7 条）：超管、管理员、财务/运营/市场专员、客服、开发
- **菜单**（menuData，16 条）：工作台 + 系统管理 + 监控（含 3 个按钮）
- **日志**（loginLogData/operationLogData，22 条）：登录日志 12 条、操作日志 10 条

### Step 2: 实现 main() 函数

用完整逻辑替换当前的 TODO 框架（详见计划文件 Task 3 Step 2 的代码块）。

**12 个执行步骤**（按依赖顺序）：
1. 清空所有表（顺序：关联表 → 主表）
2. 插入部门树（deptData）
3. 插入岗位（positionData）
4. 插入字典（dictTypeData + dictItemData）
5. 插入用户（userData，生成 bcrypt 密码，超管固定、其他随机）
6. 插入角色（roleData）
7. 插入菜单树（menuData，id1-34）
8. 插入用户-角色关联（userRoleMappings，16 条，2 个用户多角色）
9. 插入用户-岗位关联（userPositionMappings，12 条）
10. 插入角色-菜单权限（roleMenuMappings，96 条，7 个角色各有不同权限）
11. 插入登录日志（loginLogData）
12. 插入操作日志（operationLogData）

**关键细节**：
- 用户密码：id=1(admin) 用 `admin123`，其他用随机 12 位 `generateRandomPassword()`
- 记录 userPasswords 对象，末尾输出密码表（供手工测试）
- 完整数据统计和快速测试提示
- 所有 enum 值用 `as const` 类型安全

### Step 3: TypeScript 检查

```bash
pnpm --filter @sekiro/api typecheck
```

确保无错误。

### Step 4: 执行 seed 脚本测试

```bash
pnpm --filter @sekiro/api exec prisma db seed
```

验证输出：
- 各步骤进度（✅ 清空完成、✅ 部门插入完成…）
- 最终统计：部门 10 条、用户 12 条、…、角色-菜单 96 条
- 密码表：admin / admin123 + 11 个其他用户的随机密码

### Step 5: 验证数据库

用 prisma studio 查看各表数据确保正确（10 部门、12 用户、7 角色、16 菜单、6 岗位、4 字典、9 字典项、12 登录日志、10 操作日志、16 用户-角色、12 用户-岗位、96 角色-菜单）。

### Step 6: 重复执行测试

再次运行 `pnpm --filter @sekiro/api exec prisma db seed`，验证可重复执行无约束错误。

### Step 7: Commit

```bash
git add apps/api/prisma/seed.ts
git commit -m "feat(api): 完整 Seed 数据脚本实现

数据统计（105+ 条记录）:
- 12 用户 + 7 角色 + 34 菜单 + 10 部门 + 6 岗位 + 字典/日志
- 角色-菜单权限 96 条，用户-角色 16 条，用户-岗位 12 条
- 密码策略：超管固定 admin123，其他随机 bcrypt
- 可重复执行（先 truncate 后 insert）"
```

## 验收标准

- ✅ 所有 TODO 步骤已实现
- ✅ TypeScript 编译成功
- ✅ seed 脚本执行输出所有步骤完成信息及密码表
- ✅ 数据库表数据符合预期（105+ 条）
- ✅ 反复执行 seed 不出错
- ✅ Commit 提交成功

## 关键约束

- **Global Constraints** 来自计划文件：
  - 工作目录：`/Users/zero/projects/Sekiro`
  - 所有密码用 bcrypt，cost ≥ 10
  - Seed 脚本可重复执行（先清空再插入）
  - 超管 id=1，username=admin，密码固定=admin123
  - 其他用户密码随机生成（12 位）
- **数据常量**：精确匹配计划文件中的定义（部门树层级、用户部门分配、角色权限矩阵等）
- **执行顺序**：严格按 12 步顺序执行，关键依赖关系（部门 → 用户、角色 → 权限关联）

## 参考资源

- **计划文件**：`docs/superpowers/plans/2026-07-05-prisma-service-and-seed.md` — Task 3 的完整代码示例
- **设计文档**：`docs/superpowers/specs/2026-07-05-prisma-service-and-seed-design.md` — 数据规格详解
- **当前 seed.ts**：`apps/api/prisma/seed.ts` — 框架和工具函数已有，仅需填充数据和 main()
