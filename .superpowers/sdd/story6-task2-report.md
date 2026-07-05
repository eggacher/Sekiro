# Story #6 Task 2: 类型定义和 DTO - 完成报告

## 任务概述
完成 Story #6 中的 Task 2：实现 Auth 模块的类型定义和数据传输对象（DTO）。这个任务为所有后续 Auth 相关任务提供了必要的类型契约。

---

## 完成步骤

### ✅ Step 1: 验证和补充 @sekiro/shared 中的类型
- **现状**：LoginRequest 和 LoginResponse 已存在于 `packages/shared/src/types.ts`
- **补充**：添加了 RefreshRequest 和 RefreshResponse 接口定义
- **文件**：`packages/shared/src/types.ts`
- **行号**：222-231

```typescript
export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  token: string;
  expiresIn: number;
}
```

### ✅ Step 2: 创建 Auth 模块内部类型定义
- **文件**：`apps/api/src/modules/auth/types.ts`
- **内容**：
  - `TokenPayload` - JWT 访问令牌载荷（claims: sub, username, roles, iat, exp）
  - `RefreshTokenPayload` - 刷新令牌载荷（claims: sub, username, type='refresh', iat, exp）
  - `Session` - 用户登录会话对象（userId, username, token, refreshToken, remember, ip, userAgent, timestamps）
  - `LoginFailureRecord` - 防暴力破解的失败记录（userId, failureCount, lockedUntil）

### ✅ Step 3: 创建 Auth DTO 文件
**文件**：`apps/api/src/modules/auth/dtos/`

#### 3.1 login.dto.ts
- 实现 `LoginRequest` 接口
- 使用 `class-validator` 装饰器：
  - `@IsString()` - 字符串验证
  - `@Length(3, 32)` - 用户名长度限制
  - `@IsOptional()` - 可选字段（remember, captcha, captchaId）
  - `@IsBoolean()` - 布尔值验证
- 包含验证错误消息（中文）
- 重导出 `LoginResponse` 类型

#### 3.2 refresh.dto.ts
- 实现 `RefreshRequest` 接口
- 使用 `class-validator` 装饰器：
  - `@IsString()` - 字符串验证
- 包含验证错误消息（中文）
- 重导出 `RefreshResponse` 类型

#### 3.3 index.ts
- 统一导出所有 DTO 类和类型
- 支持 `import { LoginDto, RefreshDto, LoginResponse, RefreshResponse } from '@sekiro/auth/dtos'`

---

## 文件清单

### 创建的文件
```
packages/shared/src/types.ts (修改)
  - 新增 RefreshRequest 接口
  - 新增 RefreshResponse 接口

apps/api/src/modules/auth/types.ts (新建)
  - TokenPayload
  - RefreshTokenPayload
  - Session
  - LoginFailureRecord

apps/api/src/modules/auth/dtos/login.dto.ts (新建)
  - LoginDto 类（实现 LoginRequest）
  - 重导出 LoginResponse

apps/api/src/modules/auth/dtos/refresh.dto.ts (新建)
  - RefreshDto 类（实现 RefreshRequest）
  - 重导出 RefreshResponse

apps/api/src/modules/auth/dtos/index.ts (新建)
  - DTO 统一导出
```

---

## 验证结果

### 类型定义检查
- ✅ LoginRequest: 包含 username, password, remember, captcha, captchaId
- ✅ LoginResponse: 包含 token, refreshToken, expiresIn, user, permissions, menus
- ✅ RefreshRequest: 包含 refreshToken
- ✅ RefreshResponse: 包含 token, expiresIn
- ✅ TokenPayload: JWT 标准声明（sub, iss, aud, exp, iat）
- ✅ RefreshTokenPayload: 刷新令牌特定类型标记
- ✅ Session: 会话跟踪所需字段
- ✅ LoginFailureRecord: 防暴力破解机制

### DTO 验证器检查
- ✅ LoginDto 使用了 @IsString, @Length, @IsOptional, @IsBoolean
- ✅ RefreshDto 使用了 @IsString
- ✅ 所有验证消息均为中文
- ✅ 接口实现正确（implements 关键字使用）

### 文件结构检查
```
apps/api/src/modules/auth/
├── types.ts (46 行)
└── dtos/
    ├── index.ts (7 行)
    ├── login.dto.ts (30 行)
    └── refresh.dto.ts (14 行)
```

---

## Git Commit 信息

```
Commit: 9dd3853
Author: Agent
Date: 2026-07-05

feat: add auth types and DTOs

- Add RefreshRequest and RefreshResponse to @sekiro/shared
- Create auth/types.ts with TokenPayload, RefreshTokenPayload, Session, LoginFailureRecord
- Create auth/dtos/login.dto.ts with LoginDto class-validator decorators
- Create auth/dtos/refresh.dto.ts with RefreshDto class-validator decorators
- Create auth/dtos/index.ts for DTO re-exports

5 files changed, 106 insertions(+)
```

### 变更统计
- 新建文件：4 个
- 修改文件：1 个
- 总计：+106 行代码

---

## 自审发现

### 遵循的全局约束
✅ 所有类型定义来自 `@sekiro/shared`（LoginRequest, LoginResponse, RefreshRequest, RefreshResponse）
✅ 内部类型定义在 `auth/types.ts`（TokenPayload, RefreshTokenPayload, Session, LoginFailureRecord）
✅ DTO 使用 `class-validator` 进行入参校验
✅ 无依赖冲突

### 关键设计决策
1. **LoginDto 包含额外字段**：为了支持现有 LoginRequest 接口中的 captcha 和 captchaId 可选字段
2. **Session 接口扩展**：包含了 userAgent 和 ip 用于后续会话跟踪和安全审计
3. **错误消息本地化**：所有 class-validator 装饰器的错误消息使用中文
4. **类型导出策略**：DTO 中同时导出了请求 DTO 类和响应类型，便于 controller 使用

### 潜在后续需要注意
- Task 3 将需要创建 auth.service.ts，使用 TokenPayload 和 RefreshTokenPayload 生成 JWT
- Task 4 将创建 auth.controller.ts，使用 LoginDto 和 RefreshDto 进行请求验证
- 需要确保 @sekiro/shared 已正确发布到 npm registry 或 monorepo path

---

## Status

**✅ DONE**

所有需求已完成：
- RefreshRequest 和 RefreshResponse 已添加到 @sekiro/shared
- auth/types.ts 已创建，包含所有内部类型定义
- auth/dtos 已创建，包含 LoginDto 和 RefreshDto，以及统一导出
- 所有文件都通过语法检查
- Git commit 已执行

**下一步**：执行 Task 3（Auth Service 实现）
