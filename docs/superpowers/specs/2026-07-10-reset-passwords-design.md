# 数据库密码重置设计方案 (MD5+Bcrypt 规则匹配)

本文档旨在设计一种方案，在前端升级为 MD5 传输规则后，对现有数据库中的所有用户密码进行批量重置，确保全部用户密码符合 `bcrypt(md5(明文密码))` 的规则，从而能够在新系统版本中正常登录。

## 用户评审要点

> [!IMPORTANT]
> 1. 本脚本为一次性运维脚本，执行后会将除 `admin` 外的所有用户密码重置为 `sekiro123`，`admin` 重置为 `admin123`。
> 2. 脚本会在本地/生产环境的环境变量 `DATABASE_URL` 所指向的数据库上执行，因此在执行前必须确认配置。

## 设计细节

设计一个独立的 Node.js / TypeScript 脚本 [reset-passwords.ts](file://<PROJECT_ROOT>/apps/api/prisma/reset-passwords.ts)。

### 1. 技术栈与依赖
- **运行器**: `tsx`
- **数据库连接**: `PrismaClient` (来自 `@prisma/client`) + `@prisma/adapter-pg`
- **加密库**: `crypto` (Node.js 内置) 和 `bcrypt`

### 2. 算法实现
```typescript
import { createHash } from "crypto";
import * as bcrypt from "bcrypt";

// 计算 32 位小写 MD5
function md5(text: string): string {
  return createHash("md5").update(text).digest("hex");
}

// 复合加密：bcrypt(md5(明文密码))
async function hashPassword(password: string, cost = 10): Promise<string> {
  return bcrypt.hash(md5(password), cost);
}
```

### 3. 数据重置逻辑
1. 初始化数据库连接。
2. 查询所有未删除的用户（`deletedAt: null`）。
3. 遍历用户：
   - 如果是 `username === "admin"`，生成明文密码 `admin123` 的哈希值。
   - 如果是其他用户，生成明文密码 `sekiro123` 的哈希值。
   - 使用 `prisma.user.update` 更新 `passwordHash`。
4. 完成后输出统计日志。
5. 优雅关闭 Prisma 连接。

## 验证与测试方案

### 自动化验证
- 在项目根目录下运行已有的 API 测试：
  ```bash
  pnpm --filter @sekiro/api test
  ```
  确保所有用户测试、修改密码测试以及密码认证的单元测试全部跑通。

### 手动验证
1. 执行重置脚本：
   ```bash
   npx tsx apps/api/prisma/reset-passwords.ts
   ```
2. 启动前端和后端：
   ```bash
   pnpm dev
   ```
3. 在浏览器中打开登录页面，使用账号 `admin` / 密码 `admin123` 登录，验证登录流程无阻碍。
