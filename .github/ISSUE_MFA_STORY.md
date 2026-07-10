## Story: 在安全设置中开启 MFA，并在登录时支持二次验证

### 背景

当前「个人中心 → 安全设置」里虽然有一个 MFA 开关，但只是一个纯 UI 占位，没有实际功能：
- 后端没有 MFA 相关表字段和接口
- 登录流程只有用户名密码一步
- 开关点击后无任何效果

本 Story 要把这个占位变成完整的 TOTP 二次验证功能。

### 目标

1. 用户可以在安全设置中开启/关闭 TOTP MFA
2. 开启 MFA 的用户登录时，在密码验证通过后需要输入 6 位动态验证码
3. 提供一次性备份码，防止 authenticator 丢失后无法登录
4. 管理员可以重置其他用户的 MFA

### 方案概述

采用 **TOTP (Time-based One-Time Password)** 方案，使用 Google Authenticator / Microsoft Authenticator 等标准应用扫描二维码。

详细设计文档：
**`docs/superpowers/specs/2026-07-10-mfa-design.md`**

### 验收标准

#### AC1: 数据库准备
- `user` 表新增字段：`mfa_enabled`、`mfa_secret`、`mfa_backup_codes`
- `mfa_secret` 加密存储，`mfa_backup_codes` 以 bcrypt 哈希数组存储

#### AC2: 后端 MFA 模块
- 新增 `modules/mfa`，包含：
  - TOTP secret 生成与二维码生成
  - TOTP 验证码校验
  - 备份码生成、校验与用完即焚
  - 短时效 `mfaToken` JWT 签发与校验
- 新增接口：
  - `POST /api/mfa/setup` — 开始绑定 MFA
  - `POST /api/mfa/verify-setup` — 确认绑定并返回备份码
  - `POST /api/mfa/disable` — 关闭 MFA
  - `POST /api/mfa/verify` — 登录第二步验证
  - `POST /api/mfa/reset` — 管理员重置用户 MFA

#### AC3: 登录流程改造
- `POST /api/auth/login`：
  - 未开启 MFA：保持现有行为，直接返回 token
  - 已开启 MFA：返回 `code: 2` 和短期 `mfaToken`
- `POST /api/mfa/verify`：用 TOTP 或备份码完成登录，换取正式 token

#### AC4: 前端安全设置
- `/profile` 安全 Tab 的 MFA 开关改为真实受控组件
- 开启流程：密码确认 → 展示二维码 + secret → 输入验证码确认 → 展示 10 个备份码
- 关闭流程：密码 + TOTP/备份码验证后才能关闭

#### AC5: 前端登录页
- 密码验证通过后如果后端返回需要 MFA，展示 MFA 验证码输入框
- 支持输入 TOTP 或备份码

#### AC6: 管理员重置
- 用户管理页面（或用户详情）增加「重置 MFA」操作
- 仅 super_admin 可见可用

#### AC7: 测试
- TOTP 生成与验证单元测试
- 备份码一次性有效单元测试
- 登录两步流程集成测试（未开 MFA / 已开 MFA / 错误验证码 / 备份码）
- 管理员重置接口权限测试

### 依赖库建议

- `speakeasy` 或 `otpauth`：TOTP 生成/验证
- `qrcode`：二维码 DataURL 生成

### 相关文件

- `apps/api/prisma/schema.prisma`
- `apps/api/src/modules/auth/services/auth.service.ts`
- `apps/api/src/modules/auth/auth.controller.ts`
- `apps/web/app/(dashboard)/profile/page.tsx`
- `apps/web/app/(auth)/login/page.tsx`
- `packages/shared`（MFA DTO 类型）

### 优先级

P1 — 补齐安全基线能力，让现有 MFA 占位产生实际价值。

### 设计文档

详见 `docs/superpowers/specs/2026-07-10-mfa-design.md`
