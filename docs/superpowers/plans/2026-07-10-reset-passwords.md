# 数据库密码重置实施计划 (MD5+Bcrypt 规则匹配)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 编写并运行一个一次性 TypeScript 脚本，重置数据库中所有用户的密码哈希值，使其完全匹配 `bcrypt(md5(明文密码))` 加密方案。

**Architecture:** 
该运维脚本运行在 Node.js 环境中，使用 PrismaClient 与数据库连接，提取所有可用账号并依据用户类型（超级管理员 / 普通用户）分别计算其 `bcrypt(md5(明文密码))` 的密码哈希值，最终批量写回数据库中。

**Tech Stack:** TypeScript, Prisma, tsx, bcrypt, crypto

## Global Constraints
- 所有操作必须在 `feature/reset-passwords` 工作区分支下进行。
- 密码加密方案必须严格符合 NestJS 后端现有方案：即对明文密码先取 32 位小写 MD5，再对结果进行 `bcrypt(..., 10)` 加密。

---

### Task 1: 编写数据库密码重置脚本

**Files:**
- Create: `apps/api/prisma/reset-passwords.ts`
- Modify: `apps/api/package.json`

**Interfaces:**
- Consumes: PrismaClient, bcrypt
- Produces: 命令行脚本与 `pnpm` 运行命令

- [ ] **Step 1: 创建 `apps/api/prisma/reset-passwords.ts` 脚本文件**

```typescript
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcrypt";
import { createHash } from "crypto";
import pg from "pg";

const { Pool } = pg;

// 1. 初始化数据库连接（使用与 seed.ts 相同的数据源连接池适配器）
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ 错误：环境变量 DATABASE_URL 未设置");
  process.exit(1);
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 2. 计算 32 位小写 MD5 哈希
function md5(text: string): string {
  return createHash("md5").update(text).digest("hex");
}

// 3. 复合加密：bcrypt(md5(明文))
async function hashPassword(password: string, cost = 10): Promise<string> {
  return bcrypt.hash(md5(password), cost);
}

async function main() {
  console.log("🚀 开始重置数据库用户密码...");
  
  // 4. 查询所有未删除的用户
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
  });
  
  console.log(`📋 找到 ${users.length} 个活跃用户，正在重新计算密码哈希...`);

  let successCount = 0;
  for (const user of users) {
    // admin 重置为 admin123，其他用户重置为 sekiro123
    const plainPassword = user.username === "admin" ? "admin123" : "sekiro123";
    const newPasswordHash = await hashPassword(plainPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        loginFailCount: 0, // 顺便清除登录失败锁定状态
        lockedUntil: null,
      },
    });

    console.log(`✅ 已重置用户: ${user.username} (ID: ${user.id}) -> 密码已重置为: ${plainPassword}`);
    successCount++;
  }

  console.log(`🎉 密码重置完成，成功更新 ${successCount} 个用户。`);
}

main()
  .catch((e) => {
    console.error("❌ 密码重置过程中发生错误:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
```

- [ ] **Step 2: 修改 `apps/api/package.json`，增加便捷运行命令**

在 `apps/api/package.json` 的 `scripts` 中增加一条：
```json
"db:reset-passwords": "tsx prisma/reset-passwords.ts"
```

- [ ] **Step 3: 提交任务代码**

```bash
git add apps/api/prisma/reset-passwords.ts apps/api/package.json
git commit -m "feat: add db:reset-passwords script"
```

---

### Task 2: 执行脚本并验证密码可用性

**Files:**
- Test: `apps/api/prisma/reset-passwords.ts`

**Interfaces:**
- Consumes: `pnpm` 命令行与本地运行服务

- [ ] **Step 1: 运行密码重置命令**

Run: `pnpm --filter @sekiro/api db:reset-passwords`
Expected: 终端正确打印出重置日志，类似以下内容：
```
🚀 开始重置数据库用户密码...
📋 找到 12 个活跃用户，正在重新计算密码哈希...
✅ 已重置用户: admin (ID: 1) -> 密码已重置为: admin123
...
🎉 密码重置完成，成功更新 12 个用户。
```

- [ ] **Step 2: 运行测试确保无 regression 且所有密码校验逻辑正常**

Run: `pnpm --filter @sekiro/api test`
Expected: 所有的测试（包括 `auth.service.spec.ts` 和 `user.service.spec.ts`）全部 PASS。

- [ ] **Step 3: 运行前后端并手动登录验证**

1. 启动项目：
   Run: `pnpm dev`
2. 打开登录页面验证：
   - 使用 `admin` 和密码 `admin123` 登录：应正常登录成功。
   - 使用 `zhangsan` 和密码 `sekiro123` 登录：应正常登录成功。

- [ ] **Step 4: 提交并推送分支**

```bash
git add .
git commit -m "test: run reset-passwords script and verify pass"
```
