# Story #6: Auth 登录接口设计规格

**文档版本**：v1.0  
**创建日期**：2026-07-05  
**状态**：设计批准  
**相关 Issue**：Story #6（登录鉴权）、#6 auth 相关子 Task  
**相关 SPEC**：`docs/SPEC.md` §4.3、§4.3.1、§9.1（验收用例）

---

## 1. 概述与范围

### 1.1 目标

实现 Sekiro 后端的**登录鉴权模块**（Auth），支持：
- POST `/auth/login` - 账密登录，返回 JWT + RefreshToken + 用户信息 + 权限 + 菜单树
- POST `/auth/refresh` - Token 续期
- POST `/auth/logout` - 登出，清除所有凭证

### 1.2 设计原则

- **安全第一**：密码 bcrypt 验证，Token 不明文存储，失败锁定防暴力破解
- **用户友好**：失败次数透明化（告知剩余尝试次数），"记住我"无缝续期
- **性能优先**：会话存储用 Redis，权限和菜单计算高效
- **标准化**：严格遵循 `SPEC.md` 约定，返回格式与 `@sekiro/shared` 类型一致

### 1.3 范围内（P0）

✅ POST `/auth/login` - 完整实现（含失败锁定、权限、菜单）  
✅ POST `/auth/refresh` - RefreshToken 续期  
✅ POST `/auth/logout` - 登出清除  
✅ Redis 会话管理  
✅ JWT + RefreshToken 双凭证  
✅ 登录日志记录  
✅ 单元测试（核心业务逻辑）

### 1.4 范围外（P1+）

❌ GET `/auth/me` - 获取当前用户（延后到后续 Story）  
❌ GET `/auth/captcha` - 图形验证码（P1）  
❌ POST `/auth/refresh` 的刷新次数限制  
❌ Session 自动续期（30 分钟无活动自动清除）

---

## 2. 架构与文件结构

### 2.1 目录结构

```
apps/api/src/modules/auth/
├── auth.module.ts                      # NestJS 模块定义
├── auth.controller.ts                  # HTTP 接口层
├── services/
│   └── auth.service.ts                 # 业务编排层
├── providers/
│   ├── jwt.provider.ts                 # JWT 签发/验证
│   ├── redis-session.provider.ts       # Redis 会话存储
│   └── login-failure.provider.ts       # 失败锁定计数
├── dtos/
│   ├── login.dto.ts                    # LoginRequest + LoginResponse
│   └── refresh.dto.ts                  # RefreshRequest + RefreshResponse
├── types.ts                            # Token Payload、Session 等内部类型
├── index.ts                            # 模块导出
└── __tests__/
    ├── auth.service.spec.ts            # 业务逻辑单测
    ├── jwt.provider.spec.ts            # Token 单测
    ├── login-failure.provider.spec.ts  # 失败锁定单测
    └── redis-session.provider.spec.ts  # Session 单测
```

### 2.2 核心依赖注入关系

```
AuthModule
├─ exports [AuthService, PrismaService]
│
AuthController
└─ @Inject AuthService
   ├─ @Inject JwtProvider
   │   └─ uses: crypto, jwt library
   ├─ @Inject RedisSessionProvider
   │   └─ uses: redis client
   ├─ @Inject LoginFailureProvider
   │   └─ uses: redis client
   ├─ @Inject PrismaService
   │   └─ uses: database (User, Role, Menu, LoginLog)
   └─ @Inject Logger
```

### 2.3 外部依赖

| 包 | 版本 | 用途 |
|-----|------|------|
| `@nestjs/jwt` | ^11.x | JWT 签发、验证 |
| `redis` | ^4.x | Redis 客户端 |
| `bcrypt` | ^6.x | 密码 hash 和验证 |
| `@sekiro/shared` | workspace:* | 类型、枚举（已有） |

**备注**：`bcrypt` 和 `@sekiro/shared` 已在 Story #5 依赖中，`@nestjs/jwt` 和 `redis` 需要在本 Story 中新增。

---

## 3. 数据流与业务逻辑

### 3.1 登录流程（POST /auth/login）

**请求**：
```typescript
interface LoginRequest {
  username: string;      // 3-32 位，[a-zA-Z0-9_]
  password: string;      // 用户输入的明文密码
  remember?: boolean;    // 可选，"记住我"标志
}
```

**响应成功**：
```typescript
interface LoginResponse {
  code: 0;
  data: {
    token: string;              // JWT，2 小时有效期
    refreshToken: string;       // RefreshToken，30 天有效期
    expiresIn: number;          // token 有效期（秒），7200
    user: {
      id: number;
      username: string;
      nickname: string;
      email?: string;
      phone?: string;
      avatar?: string;
      status: 'enabled' | 'disabled' | 'locked';
      deptId?: number;
      // 不返回 password_hash 和 deleted_at
    };
    permissions: string[];      // 权限扁平数组，如 ["system:user:list", "system:user:create"]
    menus: MenuNode[];          // 菜单树，只包含用户有权限的节点
  }
}
```

**响应失败示例**：
```json
{
  "code": 1,
  "message": "密码错误，还剩 3 次"
}
```

**业务流程（伪代码）**：

```
1. Controller 校验入参（DTO validation）
   
2. AuthService.login(request)
   
   a) 查询 User by username
      ├─ 不存在？
      │  ├─ LoginLog.create({ username, result: 'fail', message: '账号不存在' })
      │  └─ return { code: 1, message: '账号或密码错误' }
      └─ 存在 → 继续
   
   b) 检查 user.status
      ├─ 'disabled'？
      │  ├─ LoginLog.create({ username, result: 'fail', message: '账号已停用' })
      │  └─ return { code: 1, message: '账号已停用' }
      └─ 继续
   
   c) 检查账号是否被锁定（LoginFailureProvider.isLocked）
      ├─ 是？
      │  ├─ LoginLog.create({ username, result: 'fail', message: '账号已锁定' })
      │  └─ return { code: 1, message: '账号已锁定 30 分钟' }
      └─ 继续
   
   d) 验证密码（bcrypt.compare）
      ├─ 不符？
      │  ├─ 失败计数 +1：LoginFailureProvider.incrementFailure(userId)
      │  ├─ 读取剩余次数：remainTimes = 5 - failureCount
      │  ├─ 如果 failureCount >= 5？
      │  │  └─ LoginFailureProvider.lockUser(userId, 30min)
      │  │     → 后续判断返回"账号已锁定"
      │  ├─ LoginLog.create({ username, result: 'fail', message: '密码错误' })
      │  └─ return { code: 1, message: `密码错误，还剩 ${remainTimes} 次` }
      └─ 继续
   
   e) 验证成功！清除失败计数
      └─ LoginFailureProvider.clearFailure(userId)
   
   f) 计算用户权限（全并集）
      ├─ 查询 user 的所有 roles
      ├─ 查询这些 roles 的所有 menus（去重）
      └─ 提取权限字符串数组
   
   g) 构建菜单树
      ├─ 获取用户有权限的菜单集合
      ├─ 过滤掉 status != 'enabled' 的菜单
      └─ 按 parent_id 递归构建树
   
   h) 签发 Token
      ├─ payload = { userId, username, roles: [...] }
      ├─ JWT = JwtProvider.signToken(payload, { expiresIn: '2h' })
      └─ RefreshToken = JwtProvider.signRefreshToken(payload, { expiresIn: '30d' })
   
   i) 创建 Session（Redis）
      ├─ sessionId = generateUUID()
      ├─ session = {
      │    userId, username,
      │    token: JWT,
      │    refreshToken: RefreshToken,
      │    remember: request.remember,
      │    ip: request.ip,
      │    userAgent: request.headers['user-agent'],
      │    createdAt: now,
      │    expiresAt: now + 30天
      │  }
      └─ RedisSessionProvider.createSession(sessionId, session, TTL=30天)
   
   j) 更新用户信息
      ├─ User.update({ id: userId, last_login_at: now })
      └─ LoginLog.create({ username, result: 'success', ... })
   
   k) 返回登录响应
      └─ { token, refreshToken, expiresIn: 7200, user, permissions, menus }
```

### 3.2 刷新 Token 流程（POST /auth/refresh）

**请求**：
```typescript
interface RefreshRequest {
  refreshToken: string;
}
```

**响应**：
```typescript
interface RefreshResponse {
  code: 0;
  data: {
    token: string;      // 新 JWT，2 小时有效期
    expiresIn: number;  // 7200
  }
}
```

**业务流程**：

```
1. Controller 接收 RefreshRequest
   
2. AuthService.refresh(refreshToken)
   
   a) 验证 RefreshToken
      ├─ JwtProvider.verifyRefreshToken(refreshToken)
      ├─ 无效/过期？→ return { code: 401, message: 'Token 已过期' }
      └─ 有效 → 获取 payload（userId, username）
   
   b) 查询 Redis Session
      ├─ session = RedisSessionProvider.getSession(refreshToken)
      ├─ 不存在？→ return { code: 401, message: 'Session 已失效' }
      └─ 存在 → 继续
   
   c) 检查 RefreshToken 黑名单
      ├─ 在黑名单中？→ return { code: 401, message: 'Token 已撤销' }
      └─ 继续
   
   d) 签发新 JWT
      ├─ newPayload = { userId, username, ... }
      ├─ newJWT = JwtProvider.signToken(newPayload, { expiresIn: '2h' })
      └─ 继续
   
   e) 更新 Session 中的 JWT
      ├─ RedisSessionProvider.updateSessionToken(refreshToken, newJWT)
      └─ 继续
   
   f) 返回响应
      └─ { token: newJWT, expiresIn: 7200 }
```

### 3.3 登出流程（POST /auth/logout）

**请求**：
```
Header: Authorization: Bearer <JWT>
```

**响应**：
```json
{
  "code": 0,
  "data": null
}
```

**业务流程**：

```
1. Controller 接收请求
   ├─ 需要有有效的 JWT（@UseGuards(JwtAuthGuard)）
   └─ 从 JWT 中提取 userId、sessionId（存储在 Token 中）
   
2. AuthService.logout(userId, sessionId, refreshToken)
   
   a) 删除 Redis Session
      └─ RedisSessionProvider.deleteSession(sessionId)
   
   b) 删除失败计数（如有）
      └─ LoginFailureProvider.clearFailure(userId)
   
   c) 标记 RefreshToken 黑名单
      ├─ refToken = extractFromSession(sessionId)
      └─ Redis.set(`sekiro:token:blacklist:${refToken}`, true, TTL=30天)
   
   d) 返回成功
      └─ { code: 0, data: null }
```

---

## 4. Redis 键设计与 TTL

### 4.1 键命名空间

```
# Session 存储（30 天有效期）
sekiro:session:{sessionId}
  类型：Hash
  TTL：2592000 秒（30 天）
  内容：
    {
      userId: number,
      username: string,
      token: string,                  // JWT
      refreshToken: string,
      remember: boolean,
      ip: string,
      userAgent: string,
      createdAt: ISO8601,
      lastActiveAt: ISO8601,
      expiresAt: ISO8601
    }

# 用户登录失败计数（30 分钟）
sekiro:login:failure:{userId}
  类型：String（整数）
  TTL：1800 秒（30 分钟）
  内容：失败次数（0-5）
  自动过期：Redis 自动清除

# 用户锁定标记（30 分钟）
sekiro:login:locked:{userId}
  类型：String（任意值）
  TTL：1800 秒（30 分钟）
  内容：true（存在即表示已锁定）
  自动过期：Redis 自动清除

# RefreshToken 黑名单（30 天）
sekiro:token:blacklist:{refreshTokenHash}
  类型：String
  TTL：2592000 秒（30 天）
  内容：true（存在即表示已撤销）
  说明：黑名单主要用于 logout 场景，防止已登出的 Token 被复用
```

### 4.2 Redis 配置

```typescript
// apps/api/src/config/redis.config.ts
export const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  db: parseInt(process.env.REDIS_DB || '0'),
  password: process.env.REDIS_PASSWORD || undefined,
  keyPrefix: 'sekiro:',  // 全局前缀
};
```

---

## 5. DTO 和类型定义

### 5.1 DTOs（来自 @sekiro/shared）

```typescript
// packages/shared/src/types.ts（已有或需新增）

export interface LoginRequest {
  username: string;
  password: string;
  remember?: boolean;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
  user: UserDTO;
  permissions: string[];
  menus: MenuNode[];
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  token: string;
  expiresIn: number;
}

export interface UserDTO {
  id: number;
  username: string;
  nickname: string;
  email?: string;
  phone?: string;
  avatar?: string;
  status: CommonStatus;
  deptId?: number;
}

export interface MenuNode {
  id: number;
  parentId?: number;
  title: string;
  type: 'directory' | 'menu' | 'button';
  path?: string;
  component?: string;
  icon?: string;
  permission?: string;
  sort: number;
  visible: boolean;
  status: CommonStatus;
  children?: MenuNode[];
}
```

### 5.2 内部类型（apps/api）

```typescript
// apps/api/src/modules/auth/types.ts

export interface TokenPayload {
  sub: number;           // userId
  username: string;
  roles: string[];
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  sub: number;
  username: string;
  type: 'refresh';
  iat: number;
  exp: number;
}

export interface Session {
  userId: number;
  username: string;
  token: string;
  refreshToken: string;
  remember: boolean;
  ip: string;
  userAgent: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
}

export interface LoginFailureRecord {
  userId: number;
  failureCount: number;
  lockedUntil?: Date;
}
```

---

## 6. 错误处理与异常

### 6.1 自定义异常

```typescript
// apps/api/src/modules/auth/exceptions/

export class BadCredentialsException extends HttpException {
  constructor(message = '账号或密码错误') {
    super({ code: 1, message }, HttpStatus.OK);
  }
}

export class UserDisabledException extends HttpException {
  constructor() {
    super({ code: 1, message: '账号已停用' }, HttpStatus.OK);
  }
}

export class AccountLockedException extends HttpException {
  constructor(remainingMinutes = 30) {
    super(
      { code: 1, message: `账号已锁定 ${remainingMinutes} 分钟` },
      HttpStatus.OK
    );
  }
}

export class PasswordIncorrectException extends HttpException {
  constructor(remainTimes: number) {
    super(
      { code: 1, message: `密码错误，还剩 ${remainTimes} 次` },
      HttpStatus.OK
    );
  }
}

export class TokenExpiredException extends HttpException {
  constructor() {
    super({ code: 401, message: 'Token 已过期或无效，请重新登录' }, HttpStatus.OK);
  }
}
```

### 6.2 全局异常过滤器

所有 AuthException 都由 AppModule 的全局异常过滤器统一捕获，返回标准的 `ApiResponse` 格式。

---

## 7. 安全性考虑

### 7.1 密码安全（CON-5）

✅ 存储：bcrypt cost ≥ 10（来自 Story #5 Seed）  
✅ 传输：HTTPS only（应用级约束，部署层保证）  
✅ 验证：bcrypt.compare()，不用 ===  
✅ 日志：不记录密码、Token 内容

### 7.2 Token 安全

✅ JWT 签名：使用 HS256（或 RS256，取决于环境）  
✅ RefreshToken：与 JWT 分离存储，单独黑名单管理  
✅ 有效期：JWT 2h（短期），RefreshToken 30d（长期）  
✅ 黑名单：logout 时标记 RefreshToken，防止复用

### 7.3 失败锁定防暴力破解

✅ 全局计数：同一账号无论 IP 如何，5 次失败后锁定  
✅ 自动解锁：30 分钟后 Redis 键自动过期，不需手工干预  
✅ 计数幂等：使用 Redis INCR + EXPIRE，网络重试不重复计数

### 7.4 会话隔离

✅ 每次登录生成唯一 sessionId（UUID）  
✅ logout 时明确删除 Session，不依赖 TTL  
✅ Redis 一致性：使用 Redis Pipeline 保证多个操作的原子性

---

## 8. 性能考虑

| 操作 | 位置 | 优化 |
|------|------|------|
| 登录时查权限 | Redis 缓存（2h TTL） | 减少频繁的 Prisma JOIN 查询 |
| 菜单树构建 | Redis 缓存或内存 | 限制递归深度 ≤ 5 |
| Token 验证 | 内存快速解析 | 仅在 API 网关或 Guard 中验证 |
| Session 查询 | Redis O(1) 查询 | 快速校验 logout 状态 |

---

## 9. 测试策略

### 9.1 单元测试覆盖

**AuthService**：
- ✅ 正确账密登录 → 返回 token + refreshToken + user + permissions + menus
- ✅ 账号不存在 → code=1，写日志
- ✅ 账号已停用 → code=1
- ✅ 密码错误 1-4 次 → code=1，提示剩余次数，计数 +1
- ✅ 密码错误第 5 次 → 账号锁定，返回"已锁定 30 分钟"
- ✅ 账号已锁定时登录 → code=1，无需验证密码
- ✅ 登出 → 清除 Session、失败计数、Token 黑名单
- ✅ 刷新 Token → 验证有效期，返回新 JWT
- ✅ RefreshToken 过期 → code=401

**LoginFailureProvider**：
- ✅ 首次失败计数 = 1，TTL = 30min
- ✅ 失败 5 次锁定，failureCount = 5
- ✅ isLocked() 检查锁定状态
- ✅ clearFailure() 清除计数
- ✅ 30 分钟后 Redis 键自动过期

**JwtProvider**：
- ✅ signToken() 签发 JWT，2h 有效期
- ✅ verifyToken() 验证 JWT，过期返回 null
- ✅ signRefreshToken() 签发 RefreshToken，30d 有效期
- ✅ 验证 payload 完整性

**RedisSessionProvider**：
- ✅ createSession() 创建并存储 30 天 TTL
- ✅ getSession() 查询返回完整 Session
- ✅ updateSessionToken() 更新 JWT
- ✅ deleteSession() 删除 Session
- ✅ 连接异常处理（Redis down 时的降级）

### 9.2 集成测试（可选，后续 Story）

- [ ] 完整登录 → 刷新 → 登出 流程
- [ ] 并发登录同一账号
- [ ] 网络重试幂等性（重复请求同一密码错误）

---

## 10. 接口汇总

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/auth/login` | ❌ 无 | 账密登录 |
| POST | `/auth/refresh` | ❌ 无 | Token 续期（携带 RefreshToken） |
| POST | `/auth/logout` | ✅ 有 | 登出（需有效 JWT） |

---

## 11. 验收标准（来自 SPEC §9.1）

| ID | 场景 | 预期 |
|-----|------|------|
| TC-AUTH-01 | 正确账密登录 | code=0，返回 token + user + permissions + menus |
| TC-AUTH-02 | 错误密码 | code=1，提示"密码错误，还剩 N 次"，写日志 |
| TC-AUTH-03 | 停用账号登录 | code=1，提示"已停用" |
| TC-AUTH-04 | 连续 5 次失败 | 第 5 次后账号 locked 30 分钟，无法再登录 |
| TC-AUTH-05 | 无 token 访问受保护接口 | code=401 |
| TC-AUTH-06 | 有 token 但无权限 | code=403 |
| TC-AUTH-07 | 登出后旧 token 访问 | code=401 |

---

## 12. 后续衔接

**Story #7（用户管理）**：
- 依赖本 Story 的 AuthService、JwtProvider、RedisSessionProvider
- 权限验证中间件会用 `@UseGuards(JwtAuthGuard)`

**Story #8（权限与菜单管理）**：
- 权限管理接口需要复用 `PermissionService.getUserPermissions()`

---

## 13. 变更记录

| 版本 | 日期 | 变更 |
|------|------|------|
| v1.0 | 2026-07-05 | 初版设计，基于 brainstorming 过程 |
