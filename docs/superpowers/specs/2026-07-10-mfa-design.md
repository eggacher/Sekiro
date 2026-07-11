# Issue #32: 多因素认证（MFA / TOTP）设计规格

**文档版本**：v1.1  
**创建日期**：2026-07-10  
**状态**：设计已批准 / 实现完成  
**相关 Issue**：#32（MFA）  
**相关 SPEC**：`docs/PRD.md` §5.2 F-AUTH-09、`docs/FEATURES.md` §P1  

---

## 1. 概述与范围

### 1.1 目标

为 Sekiro 实现基于 TOTP（Time-based One-Time Password）的多因素认证，支持用户通过 Google Authenticator、Microsoft Authenticator、Authy 等标准 TOTP 应用开启二次验证，提升账号安全。

### 1.2 设计原则

- **标准兼容**：遵循 [RFC 6238](https://tools.ietf.org/html/rfc6238) TOTP 标准，6 位数字、30 秒时间窗口。
- **渐进开启**：MFA 默认关闭，由用户在自己的个人中心主动开启。
- **登录无感降级**：未开启 MFA 的用户登录流程完全不变。
- **密钥安全**：TOTP secret 在数据库中必须加密存储，不保存明文。
- **失败防护**：MFA 验证失败不影响原密码登录的失败计数体系。

### 1.3 范围内（P0）

✅ 在 `User` 模型新增 `mfaSecret`（加密）和 `mfaEnabled` 字段  
✅ 个人中心 MFA 开启流程：生成 secret → 展示二维码 → 用户输入验证码确认 → 启用  
✅ 个人中心 MFA 关闭流程：需再次验证 TOTP 后关闭  
✅ 登录两步验证：密码正确且 MFA 已启用时，进入 TOTP 验证页  
✅ 新增后端接口：
  - `POST /auth/mfa/setup` - 生成 MFA 绑定信息（需登录）
  - `POST /auth/mfa/verify` - 确认并启用 MFA（需登录）
  - `POST /auth/mfa/disable` - 关闭 MFA（需登录 + TOTP 验证）
  - `POST /auth/mfa/login-verify` - 登录第二步 TOTP 验证（无需登录，携带临时 token）
✅ 更新登录接口：MFA 启用时返回 `mfaRequired: true` 和临时 token  
✅ 前端登录页增加 TOTP 输入步骤  
✅ 前端个人中心安全 Tab 中实现 MFA 开关与二维码弹窗  
✅ 单元测试覆盖核心逻辑  

### 1.4 范围外（P1+）

❌ 恢复码（Recovery Codes）：账号丢失 Authenticator 后的兜底方案，后续 issue 扩展  
❌ 管理员强制/重置用户 MFA：需配合用户管理模块的权限设计，后续扩展  
❌ 短信/邮件 OTP：超出 TOTP 范围  
❌ 硬件安全密钥（WebAuthn / FIDO2）：超出 TOTP 范围  

---

## 2. 架构与文件结构

### 2.1 目录结构

```
apps/api/src/modules/auth/
├── auth.module.ts                      # 注册 MfaProvider、MfaService
├── auth.controller.ts                  # 新增 MFA 相关端点
├── services/
│   ├── auth.service.ts                 # 修改登录流程，支持 mfaRequired
│   └── mfa.service.ts                  # MFA 业务编排
├── providers/
│   ├── jwt.provider.ts                 # 新增 signMfaToken / verifyMfaToken
│   ├── mfa.provider.ts                 # TOTP 生成与验证（speakeasy 封装）
│   └── mfa-crypto.provider.ts          # MFA secret 加解密
├── dtos/
│   ├── login.dto.ts                    # LoginResponse 扩展 mfaRequired/mfaToken
│   ├── mfa-setup.dto.ts                # MFA 绑定请求/响应 DTO
│   ├── mfa-verify.dto.ts               # 启用/登录验证 DTO
│   └── mfa-disable.dto.ts              # 关闭 MFA DTO
└── services/__tests__/
    └── mfa.service.spec.ts             # MFA 业务单测

apps/web/app/
├── (auth)/login/page.tsx               # 增加 MFA 验证步骤
└── (dashboard)/profile/page.tsx        # 实现 MFA 开关与二维码弹窗

apps/web/components/
└── mfa/
    ├── mfa-setup-dialog.tsx            # MFA 绑定弹窗
    └── mfa-verify-input.tsx            # TOTP 六位输入组件
```

### 2.2 核心依赖注入关系

```
AuthModule
├─ exports [AuthService, JwtProvider, MfaService]
│
AuthController
├─ @Inject AuthService
│  └─ 登录流程判断 mfaEnabled
├─ @Inject MfaService
│  ├─ @Inject MfaProvider
│  │   └─ uses: speakeasy
│  ├─ @Inject MfaCryptoProvider
│  │   └─ uses: crypto (AES-256-GCM)
│  ├─ @Inject JwtProvider
│  │   └─ uses: @nestjs/jwt
│  └─ @Inject PrismaService
│      └─ uses: database (User)
└─ @Inject JwtAuthGuard（保护 setup/verify/disable）
```

### 2.3 外部依赖

| 包 | 版本 | 用途 |
|-----|------|------|
| `speakeasy` | ^2.x | TOTP secret 生成与验证码校验 |
| `@types/speakeasy` | ^2.x | speakeasy 类型定义 |
| `qrcode` | ^1.x | 生成二维码 Data URL |
| `@types/qrcode` | ^1.x | qrcode 类型定义 |

---

## 3. 数据模型变更

### 3.1 Prisma schema

```prisma
model User {
  id             Int       @id @default(autoincrement())
  username       String    @unique @db.VarChar(32)
  passwordHash   String    @map("password_hash") @db.VarChar(255)
  nickname       String    @db.VarChar(32)
  email          String?   @db.VarChar(128)
  phone          String?   @db.VarChar(20)
  avatar         String?   @db.VarChar(512)
  deptId         Int?      @map("dept_id")
  status         String    @default("enabled") @db.VarChar(16)
  lockedUntil    DateTime? @map("locked_until")
  loginFailCount Int       @default(0) @map("login_fail_count")
  lastLoginAt    DateTime? @map("last_login_at")
  mfaSecret      String?   @map("mfa_secret") @db.VarChar(512)  // 加密后的 TOTP secret
  mfaEnabled     Boolean   @default(false) @map("mfa_enabled")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")
  deletedAt      DateTime? @map("deleted_at")

  dept      Dept?          @relation("UserDept", fields: [deptId], references: [id])
  roles     UserRole[]
  positions UserPosition[]

  @@map("user")
}
```

### 3.2 字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `mfaSecret` | `String?` | 加密后的 TOTP secret，使用 AES-256-GCM 加密，存储为 `ENC(iv:cipher:authTag)` 格式 |
| `mfaEnabled` | `Boolean` | MFA 是否启用，仅当用户完成首次验证码确认后才置为 `true` |

### 3.3 加密方案

- 复用 `apps/api/src/modules/security/utils/crypto.util.ts` 中的 AES-256-GCM 实现。
- 使用独立环境变量 `MFA_SECRET_KEY` 作为加解密密钥（长度 32 字节 base64/hex，或任意字符串经 scrypt 派生）。
- 生产环境必须设置 `MFA_SECRET_KEY`；开发环境可回退到 `JWT_SECRET`，但启动时打印警告。
- 除 `/auth/mfa/setup` 响应外，不将明文 secret 写入数据库、日志或返回给前端。

---

## 4. 数据流与业务逻辑

### 4.1 MFA 开启流程

```
1. 用户进入个人中心 → 安全设置 → 点击"开启两步验证"

2. 前端调用 POST /auth/mfa/setup（需 JWT）
   
   AuthController → MfaService.setup(userId)
   
   a) 查询 User，检查 `mfaEnabled !== true`（已启用则抛出异常；未完成绑定则允许重新生成）
   b) 生成新的 TOTP secret（32 字符 base32）
   c) 用 MfaCryptoProvider 加密 secret
   d) 更新 user.mfaSecret（先保存加密值，mfaEnabled 仍为 false）
   e) 生成 otpauth URL：
      otpauth://totp/Sekiro:{username}?secret={secret}&issuer=Sekiro
   f) 用 qrcode 生成 Data URL 二维码
   g) 返回 { secret, qrCodeUrl, manualEntryKey }

3. 前端展示二维码和手动输入密钥

4. 用户在 Authenticator 中添加账户后，输入 6 位验证码

5. 前端调用 POST /auth/mfa/verify（需 JWT）
   
   AuthController → MfaService.verifyAndEnable(userId, code)
   
   a) 查询 User 的 mfaSecret
   b) MfaCryptoProvider 解密得到明文 secret
   c) MfaProvider.verify(secret, code) → 校验 TOTP
   d) 校验通过 → user.mfaEnabled = true，保存
   e) 返回 { enabled: true }

6. 前端提示"两步验证已开启"，Switch 置为开启状态
```

### 4.2 MFA 关闭流程

```
1. 用户在个人中心点击关闭 MFA Switch

2. 前端弹出验证弹窗，要求输入当前 TOTP 验证码

3. 用户输入后，前端调用 POST /auth/mfa/disable（需 JWT）
   
   AuthController → MfaService.disable(userId, code)
   
   a) 查询 User 的 mfaSecret 和 mfaEnabled
   b) 解密 secret
   c) MfaProvider.verify(secret, code)
   d) 校验通过 → mfaEnabled = false，mfaSecret = null，保存
   e) 返回 { enabled: false }

4. 前端提示"两步验证已关闭"
```

### 4.3 登录流程（含 MFA）

```
1. 用户在登录页输入用户名、密码

2. 前端调用 POST /auth/login
   
   AuthService.login(request)
   
   a) 原有流程：查用户、检查状态、检查锁定、验证密码
   b) 密码验证通过后：
      ├─ 如果 user.mfaEnabled === false
      │  └─ 走原有流程，直接签发 token，返回完整 LoginResponse
      └─ 如果 user.mfaEnabled === true
         ├─ 生成 MFA 临时 token（mfaToken），5 分钟有效期
         ├─ payload: { sub: userId, username, remember, type: 'mfa' }
         ├─ 不创建正式 Session，不写成功登录日志
         └─ 返回 { code: 0, data: { mfaRequired: true, mfaToken } }

3. 前端检测到 mfaRequired=true，进入 MFA 输入页

4. 用户输入 6 位 TOTP

5. 前端调用 POST /auth/mfa/login-verify
   
   AuthController → MfaService.verifyLogin(mfaToken, code)
   
   a) JwtProvider.verifyMfaToken(mfaToken)
      ├─ 无效/过期 → return { code: 401, message: '验证已过期，请重新登录' }
      └─ 有效 → 获取 userId
   b) 查询 User 的 mfaSecret
   c) 解密 secret
   d) MfaProvider.verify(secret, code)
      ├─ 失败 → return { code: 1, message: '验证码错误或已过期' }
      └─ 成功 → 继续
   e) 清除登录失败计数
   f) 计算权限、菜单树
   g) 创建 Session，签发正式 JWT + RefreshToken
   h) 写成功登录日志
   i) 返回完整 LoginResponse

6. 前端拿到正式 token，完成登录跳转
```

### 4.4 获取当前用户信息

`GET /auth/me` 返回的 `CurrentUser` 中增加 `mfaEnabled: boolean`，便于前端在个人中心展示正确状态。

---

## 5. DTO 和类型定义

### 5.1 后端 DTOs

```typescript
// apps/api/src/modules/auth/dtos/mfa-setup.dto.ts

export class MfaSetupDto {}

export class MfaSetupResponseDto {
  secret!: string;          // 明文 secret（仅展示一次，用于手动输入）
  qrCodeUrl!: string;       // 二维码 Data URL
  manualEntryKey!: string;  // 与 secret 相同，便于 UI 展示
}

// apps/api/src/modules/auth/dtos/mfa-verify.dto.ts

export class MfaVerifyDto {
  code!: string;            // 6 位数字 TOTP
}

export class MfaVerifyResponseDto {
  enabled!: boolean;
}

// apps/api/src/modules/auth/dtos/mfa-disable.dto.ts

export class MfaDisableDto {
  code!: string;            // 当前 TOTP 验证码
}

// apps/api/src/modules/auth/dtos/mfa-login-verify.dto.ts

export class MfaLoginVerifyDto {
  mfaToken!: string;
  code!: string;
}

// apps/api/src/modules/auth/dtos/login.dto.ts（更新 LoginResponse）

export class LoginResponseDto {
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
  user?: UserDto;
  permissions?: string[];
  menus?: MenuNode[];
  mfaRequired?: boolean;
  mfaToken?: string;
}
```

### 5.2 @sekiro/shared 类型更新

```typescript
// packages/shared/src/types.ts

export interface LoginRequest {
  username: string;
  password: string;
  captcha?: string;
  captchaId?: string;
  remember?: boolean;
}

export interface LoginResponse {
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
  user?: Omit<User, "createdAt">;
  permissions?: string[];
  menus?: Menu[];
  mfaRequired?: boolean;
  mfaToken?: string;
}

export interface CurrentUser {
  id: number;
  username: string;
  nickname: string;
  avatar?: string;
  email?: string;
  phone?: string;
  roles: string[];
  permissions: string[];
  mfaEnabled?: boolean;
}

export interface MfaSetupResponse {
  secret: string;
  qrCodeUrl: string;
  manualEntryKey: string;
}

export interface MfaVerifyRequest {
  code: string;
}

export interface MfaVerifyResponse {
  enabled: boolean;
}

export interface MfaLoginVerifyRequest {
  mfaToken: string;
  code: string;
}
```

### 5.3 内部类型

```typescript
// apps/api/src/modules/auth/types.ts

export interface MfaTokenPayload {
  sub: number;
  username: string;
  remember?: boolean;
  type: 'mfa';
  iat: number;
  exp: number;
}
```

---

## 6. 错误处理与异常

### 6.1 新增异常

```typescript
// apps/api/src/modules/auth/exceptions/

export class MfaCodeIncorrectException extends HttpException {
  constructor() {
    super({ code: 1, message: '验证码错误或已过期' }, HttpStatus.OK);
  }
}

export class MfaTokenExpiredException extends HttpException {
  constructor() {
    super({ code: 401, message: '验证已过期，请重新登录' }, HttpStatus.OK);
  }
}

export class MfaAlreadyEnabledException extends HttpException {
  constructor() {
    super({ code: 1, message: '两步验证已开启' }, HttpStatus.OK);
  }
}

export class MfaNotEnabledException extends HttpException {
  constructor() {
    super({ code: 1, message: '未开启两步验证' }, HttpStatus.OK);
  }
}
```

### 6.2 错误码约定

| code | 场景 |
|------|------|
| 0 | 成功 |
| 1 | 业务错误（验证码错误、未开启等） |
| 401 | MFA 临时 token 过期或无效 |
| 422 | 参数校验失败 |

---

## 7. 安全性考虑

### 7.1 TOTP secret 安全

✅ 数据库存储加密后的 secret，加密密钥来自 `MFA_SECRET_KEY` 环境变量  
✅ 开启 MFA 时，明文 secret 仅在 setup 响应中返回一次，之后不再下发  
✅ 关闭 MFA 时，清空数据库中的 `mfaSecret` 字段  
✅ 日志中不记录 secret、验证码、mfaToken

### 7.2 MFA 临时 token 安全

✅ 复用 JWT 签名密钥签发 mfaToken，payload 中声明 `type: 'mfa'` 以区别于正式 JWT  
✅ `JwtAuthGuard` 校验 token 时必须拒绝 `type: 'mfa'` 的 token，禁止其访问任何受保护资源  
✅ 有效期 5 分钟，仅用于 TOTP 验证  
✅ 不创建 Redis Session，验证失败不泄露账号是否启用 MFA  
✅ 验证成功后立即作废，不缓存复用

### 7.3 暴力破解防护

✅ MFA 验证错误不触发账号锁定（避免锁定合法用户）  
✅ MFA 临时 token 短有效期天然限制重放窗口  
✅ 登录接口保持原有 @Throttle 限流（5 次/分钟）

### 7.4 时间窗口宽容

✅ TOTP 校验使用 `window: 1`，即当前时间步 ±1 个 30 秒窗口，允许客户端时间轻微偏移

---

## 8. 前端交互设计

### 8.1 登录页

- 账密验证通过后，若后端返回 `mfaRequired: true`，隐藏密码表单，显示 TOTP 六位输入框。
- 用户输入 6 位数字后，调用 `/auth/mfa/login-verify`。
- 成功则保存 token 并跳转；失败则提示"验证码错误或已过期"，允许重试。
- 提供"返回重新登录"按钮，清除 mfaToken 并回到账密输入。

### 8.2 个人中心安全 Tab

- 当前 MFA 开关状态从 `/auth/me` 的 `mfaEnabled` 获取。
- 点击开启：
  1. 调用 `/auth/mfa/setup`，弹出二维码弹窗。
  2. 展示二维码、手动输入密钥、6 位验证码输入框。
  3. 用户输入验证码后调用 `/auth/mfa/verify`。
  4. 成功后开关置为开启状态。
- 点击关闭：
  1. 弹出验证弹窗，要求输入当前 TOTP。
  2. 调用 `/auth/mfa/disable`。
  3. 成功后开关置为关闭状态。

### 8.3 组件拆分

- `MfaSetupDialog`：二维码展示 + 验证码确认。
- `MfaVerifyInput`：6 位数字输入，可复用于登录页和关闭验证。

---

## 9. 测试策略

### 9.1 单元测试

**MfaProvider**：
- ✅ 生成 secret 为合法 base32 字符串
- ✅ 对正确时间窗口内的 TOTP 验证码返回 true
- ✅ 对错误验证码返回 false
- ✅ 对过期时间窗口（±2 步外）返回 false

**MfaCryptoProvider**：
- ✅ 加密后的值可正确解密
- ✅ 解密非 `ENC(...)` 格式抛出明确错误
- ✅ 使用错误密钥解密失败

**MfaService**：
- ✅ setup 生成二维码并保存加密 secret
- ✅ setup 对已启用用户抛出 MfaAlreadyEnabledException
- ✅ verifyAndEnable 对正确验证码启用 MFA
- ✅ verifyAndEnable 对错误验证码不启用
- ✅ disable 对正确验证码关闭 MFA 并清空 secret
- ✅ disable 对错误验证码保持启用
- ✅ verifyLogin 对正确验证码签发正式 token
- ✅ verifyLogin 对过期 mfaToken 返回 401
- ✅ verifyLogin 对错误验证码返回 code=1

**AuthService.login**：
- ✅ MFA 未启用时返回完整 LoginResponse
- ✅ MFA 已启用时返回 `mfaRequired: true` 和 `mfaToken`
- ✅ MFA 已启用时不创建正式 Session

### 9.2 集成测试（可选）

- [ ] 完整流程：开启 MFA → 登出 → 登录时输入 TOTP → 成功进入系统
- [ ] 错误 TOTP 连续 3 次后仍可使用正确 TOTP 登录

---

## 10. 接口汇总

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/auth/login` | ❌ 无 | 账密登录；MFA 启用时返回临时 token |
| POST | `/auth/mfa/setup` | ✅ JWT | 生成 TOTP secret 和二维码 |
| POST | `/auth/mfa/verify` | ✅ JWT | 验证首条 TOTP 并启用 MFA |
| POST | `/auth/mfa/disable` | ✅ JWT | 验证 TOTP 后关闭 MFA |
| POST | `/auth/mfa/login-verify` | ❌ 无 | 使用 mfaToken + TOTP 完成登录 |
| GET | `/auth/me` | ✅ JWT | 返回用户信息（含 `mfaEnabled`） |

---

## 11. 验收标准

| ID | 场景 | 预期 |
|-----|------|------|
| TC-MFA-01 | 未开启 MFA 的用户登录 | 流程不变，直接返回 token |
| TC-MFA-02 | 已开启 MFA 的用户登录 | 密码正确后返回 `mfaRequired=true` 和 `mfaToken` |
| TC-MFA-03 | 输入正确 TOTP 完成登录 | 返回正式 token、user、permissions、menus |
| TC-MFA-04 | 输入错误 TOTP | 返回 `code=1`，提示"验证码错误或已过期" |
| TC-MFA-05 | mfaToken 过期后再验证 | 返回 `code=401`，提示重新登录 |
| TC-MFA-06 | 个人中心开启 MFA | 展示二维码，验证首条 TOTP 后 `mfaEnabled=true` |
| TC-MFA-07 | 个人中心关闭 MFA | 验证当前 TOTP 后 `mfaEnabled=false`，数据库 secret 清空 |
| TC-MFA-08 | 数据库中的 mfaSecret | 必须为 `ENC(...)` 加密格式，无明文 |
| TC-MFA-09 | TOTP 与标准 Authenticator 兼容 | Google/Microsoft Authenticator 可正常添加并生成有效验证码 |

---

## 12. 部署与迁移说明

### 12.1 开发环境

- 本地使用 `prisma migrate dev` 生成并应用迁移。
- 由于仓库此前使用 `prisma db push` 管理数据库，Task 1 建立了 `0_init` baseline migration 和 `add_mfa_fields` 增量迁移。

### 12.2 生产环境（关键）

对于已经通过 `prisma db push` 初始化的生产数据库，不能直接应用 `0_init` baseline migration（会尝试 `CREATE TABLE` 已存在的表）。必须：

1. 在生产数据库上标记 baseline migration 已应用（不实际执行 SQL）：
   ```bash
   pnpm prisma migrate resolve --applied 0_init
   ```
2. 再应用增量迁移：
   ```bash
   pnpm prisma migrate deploy
   ```

对于全新的空数据库，直接运行 `pnpm prisma migrate deploy` 即可。

### 12.3 环境变量

生产部署前必须设置：
- `MFA_SECRET_KEY`：用于加密 TOTP secret，长度建议 ≥32 字节，必须保密。
- `JWT_SECRET`：用于签名 mfaToken 和正式 JWT，必须保密。

---

## 13. 后续衔接

**Issue #32 完成后**：
- 可扩展恢复码功能（Issue #XX）。
- 可扩展管理员重置用户 MFA（Issue #XX）。
- 可扩展系统级 MFA 强制策略（Issue #XX）。

---

## 13. 变更记录

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0 | 2026-07-10 | 初版设计，基于 brainstorming 方案 A |
