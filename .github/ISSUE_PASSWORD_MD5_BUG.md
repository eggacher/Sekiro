## Bug: 前端密码以明文形式提交到后端

### 问题描述

目前前端在登录和修改密码时，直接将用户输入的明文密码发送到后端，存在以下风险：
- 密码在 HTTPS 请求体中以明文传输，可被浏览器插件、代理日志、服务器访问日志等截获
- 不符合一般中后台系统的安全基线要求

### 当前受影响的场景

1. **登录**
   - 前端：`apps/web/app/(auth)/login/page.tsx`
   - 接口：`POST /api/auth/login`
   - 当前请求体：`{ username, password, remember }`，password 为明文

2. **修改当前用户密码**
   - 前端：`apps/web/app/(dashboard)/profile/page.tsx`
   - 接口：`PUT /api/system/user/password`
   - 当前请求体：`{ oldPassword, newPassword }`，两者均为明文

3. **管理员重置密码（后端行为）**
   - 接口：`PUT /api/system/user/:id/reset-password`
   - 后端生成默认密码 `sekiro123` 并直接 bcrypt 存储
   - 此功能前端不提交密码，但存储逻辑需与新的密码策略保持一致

### 期望行为

1. 前端在提交任何密码字段前，先使用 **MD5** 对密码进行单向哈希，再将 MD5 值发送到后端。
2. 后端将所有接收到的密码字段视为 MD5 后的值进行处理：
   - 登录校验：`bcrypt.compare(md5Password, user.passwordHash)`
   - 修改密码：`bcrypt.compare(md5OldPassword, user.passwordHash)`，`bcrypt.hash(md5NewPassword, 10)`
   - 创建用户/重置密码：`bcrypt.hash(md5(defaultPassword), 10)`
3. 现有数据库中的 `passwordHash` 需要迁移，因为它们目前是 `bcrypt(明文密码)`，而不是 `bcrypt(md5(明文密码))`。

### 迁移方案（需决策）

#### 方案 A：强制所有用户重置密码（简单安全）

- 添加 migration 清空所有用户的 `passwordHash`
- 首次登录时提示用户必须重置密码
- 适合开发/测试环境

#### 方案 B：登录时自动升级（用户体验更好）

- 保留旧 `passwordHash` 不变
- 登录成功后，如果检测到旧格式，立即用 `bcrypt.hash(md5(password))` 更新为新版 hash
- 需要一个标记位或 hash 前缀来区分新旧格式
- 实现较复杂，需处理并发和失败回滚

**推荐方案 A**，因为项目目前处于脚手架/开发阶段，用户量可控，且方案更安全清晰。

### 验收标准

#### AC1: 前端登录密码 MD5 化
- 在 `apps/web/app/(auth)/login/page.tsx` 中，`handleSubmit` 提交前对 `password` 做 MD5
- 发送到后端的 `password` 字段为 32 位小写 MD5 值

#### AC2: 前端修改密码 MD5 化
- 在 `apps/web/app/(dashboard)/profile/page.tsx` 中，对 `oldPassword` 和 `newPassword` 都做 MD5 后再提交
- 保持前端本地校验不变（新密码长度、两次输入一致等）

#### AC3: 后端登录校验适配
- `apps/api/src/modules/auth/services/auth.service.ts`
- `bcrypt.compare(password, user.passwordHash)` 改为比较 MD5 后的密码

#### AC4: 后端修改密码适配
- `apps/api/src/modules/user/services/user.service.ts` 的 `changePassword`
- `bcrypt.compare(oldPassword, ...)` 和 `bcrypt.hash(newPassword, ...)` 都使用 MD5 后的值

#### AC5: 后端默认密码/重置密码适配
- `user.service.ts` 中创建用户和重置密码时，默认密码 `sekiro123` 需先 MD5 再 bcrypt
- 修改后登录默认密码仍为 `sekiro123`（用户输入的明文），但传输和存储都改为 MD5 形式

#### AC6: 数据迁移
- 提供 Prisma migration 或一次性脚本，将所有现有 `passwordHash` 更新为 `bcrypt(md5(原明文密码))`（如果已知）
- 或在 issue 中明确采用方案 A（强制重置），并更新 seed 脚本使测试账号密码符合新策略

#### AC7: 测试更新
- 更新 `apps/api/src/modules/auth/services/__tests__/auth.service.spec.ts`
- 更新 `apps/api/src/modules/user/__tests__/user.service.spec.ts`
- 测试中构造密码时，先计算 MD5 再 bcrypt

#### AC8: 新增公共 MD5 工具
- 前端：`apps/web/lib/utils.ts` 或新建 `apps/web/lib/crypto.ts`，提供 `md5(text)` 函数
- 后端：可使用 Node.js 内置 `crypto.createHash('md5')`，或统一封装到 `apps/api/src/common/utils/crypto.util.ts`

### 依赖

- 前端可使用 `crypto-js` 的 `MD5` 方法，或使用更小的 `md5` 库
- 后端使用 Node.js 内置 `crypto` 模块即可

### 相关文件

- `apps/web/app/(auth)/login/page.tsx`
- `apps/web/app/(dashboard)/profile/page.tsx`
- `apps/web/lib/utils.ts`
- `apps/api/src/modules/auth/services/auth.service.ts`
- `apps/api/src/modules/auth/services/__tests__/auth.service.spec.ts`
- `apps/api/src/modules/user/services/user.service.ts`
- `apps/api/src/modules/user/__tests__/user.service.spec.ts`
- `apps/api/prisma/seed.ts`
- `apps/api/prisma/schema.prisma`（如需新增标记字段）

### 优先级

P1 — 安全基线缺陷，应在正式使用前修复。

### 备注

- 使用 MD5 只是为了避免明文传输，不是替代后端的 bcrypt。
- 后续如升级为更安全的客户端哈希（如 SHA-256 + salt），可复用同一套前后端改造结构。
