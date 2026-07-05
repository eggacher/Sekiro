# Task 4: 集成验证与文档 — 任务简述

## 概述

执行完整的集成验证，确保 PrismaService 和 Seed 数据脚本可正确集成到应用中，并更新文档说明 Seed 使用方法。

## 输入

- Task 1 完成：PrismaService、PrismaModule 已创建
- Task 3 完成：Seed 数据脚本已完整实现，110+ 条数据
- 应用结构：pnpm workspace，`@sekiro/api` 子包

## 输出

- ✅ Seed 脚本验证通过（完整执行、可重复执行）
- ✅ PrismaService 集成验证通过
- ✅ `apps/api/README.md` 更新，包含 Seed 使用说明
- ✅ TypeScript 全量检查通过
- ✅ 最终 commit 提交

## 详细步骤

### Step 1: 运行完整的数据库测试流程

```bash
# 推送 schema 到数据库
pnpm --filter @sekiro/api exec prisma db push

# 执行 seed 脚本，插入所有示例数据
pnpm --filter @sekiro/api exec prisma db seed
```

**验证指标**：
- 无错误输出
- 输出包含所有 12 个 step 的成功日志
- 最终输出密码表和数据统计
- 显示：`✅ 种子数据导入全部完成！`

### Step 2: 验证 PrismaService 在应用中的可用性

```bash
# 查看应用入口
cat apps/api/src/main.ts
```

**验证指标**：
- 文件存在（Task 1 时创建）
- 后续可能在 AppModule 中引入 PrismaModule

### Step 3: 更新 README.md

修改 `apps/api/README.md`，在 "## 下一步" 部分前加入以下内容：

```markdown
## Seed 数据

项目包含完整的示例数据 seed 脚本（`prisma/seed.ts`），覆盖：
- 12 个用户（含超管账号 `admin / admin123`）
- 7 个角色 + 精细菜单权限映射（96 条权限）
- 完整的部门树、岗位、菜单树、字典
- 登录日志和操作日志示例

### 快速初始化数据库

```bash
# 建表
pnpm --filter @sekiro/api exec prisma db push

# 灌入示例数据
pnpm --filter @sekiro/api exec prisma db seed

# 查看数据（可选）
pnpm --filter @sekiro/api exec prisma studio
```

### 测试账号

| 账号 | 密码 | 权限 |
|------|------|------|
| admin | admin123 | 超级管理员 |
| zhangsan | 见控制台输出 | 管理员 |
| 其他用户 | 见控制台输出 | 各专员角色 |

Seed 脚本完成时会输出所有账号密码。

### 反复运行 Seed

Seed 脚本每次执行都会先清空所有数据再重新插入，支持反复执行：

```bash
pnpm --filter @sekiro/api exec prisma db seed
```

**注意**：生产环境不应包含此 seed 脚本。
```

### Step 4: TypeScript 全量检查

```bash
# 在项目根目录运行全量 TypeScript 检查
pnpm typecheck
```

**验证指标**：
- 无错误输出
- 所有类型检查通过

### Step 5: Commit Task 4

```bash
cd /Users/zero/projects/Sekiro
git add apps/api/README.md
git commit -m "docs(api): Seed 脚本使用说明

- 补充 Seed 数据说明和测试账号列表
- 说明如何快速初始化数据库
- 标注生产环境注意事项"
```

## 验收标准

- ✅ `pnpm --filter @sekiro/api exec prisma db push` 成功
- ✅ `pnpm --filter @sekiro/api exec prisma db seed` 成功，输出所有步骤和密码表
- ✅ Seed 脚本可反复执行，第二次执行无错误
- ✅ `apps/api/README.md` 已更新，包含 Seed 完整说明
- ✅ `pnpm typecheck` 全量检查通过
- ✅ git commit 提交成功

## 全局约束

- 工作目录：`/Users/zero/projects/Sekiro`
- 所有 pnpm 命令格式：`pnpm --filter @sekiro/api <cmd>` 或 `pnpm <cmd>`
- TypeScript strict 模式
- 所有密码用 bcrypt，cost ≥ 10

## 参考资源

- **计划文件**：`docs/superpowers/plans/2026-07-05-prisma-service-and-seed.md` — Task 4 完整说明
- **实现代码**：`apps/api/prisma/seed.ts` — 已完成的 Seed 脚本
- **README**：`apps/api/README.md` — 需更新
