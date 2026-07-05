# Story #6: Auth 登录接口实现计划

> **For agentic workers:** RECOMMENDED SUB-SKILL: Use `superpowers:subagent-driven-development` to implement this plan task-by-task with automated review gates between each task.

**Goal:** 实现 Sekiro 后端完整的登录鉴权系统（JWT + RefreshToken，失败锁定，权限菜单树），支持 POST /auth/login、/auth/refresh、/auth/logout 三个核心接口。

**Architecture:** 标准 NestJS 分层（Controller → Service → Providers）。分离关注点：AuthService 负责业务编排，JwtProvider 处理 Token，RedisSessionProvider 管理会话，LoginFailureProvider 追踪失败计数。所有业务逻辑可独立单测，接口通过集成测试验证。

**Tech Stack:** 
- NestJS 11.x（已有）
- `@nestjs/jwt` + `jsonwebtoken`（新增）
- Redis 4.x（新增，用于会话和失败计数）
- Prisma 7.x（已有，数据库访问）
- bcrypt 6.x（已有，密码验证）

---

## Global Constraints

- 所有 HTTP 响应使用 `ApiResponse<T>` 格式，业务码全走 HTTP 200（SPEC §4.2）
- JWT Token 有效期固定 2 小时（7200 秒），RefreshToken 30 天（2592000 秒）
- 密码失败锁定阈值固定 5 次，锁定时间 30 分钟
- Redis 键前缀统一为 `sekiro:` （可在 RedisModule 配置中修改）
- 所有时间字段使用 ISO 8601 UTC 格式（SPEC §2.2 CON-6）
- 密码、Token、密钥禁止以明文出现在日志或响应（SPEC §2.2 CON-5）
- 所有类型定义来自 `@sekiro/shared`，不在 api 包中重复定义
- 数据库访问仅通过 PrismaService（已由 Story #5 提供），禁止 SQL 拼接

---

## File Structure

### 新增文件

```
apps/api/src/modules/auth/
├── auth.module.ts                      # NestJS 模块注册，export AuthService
├── auth.controller.ts                  # HTTP 接口层（3 个端点）
├── services/
│   └── auth.service.ts                 # 业务编排（调度 Providers 和 PrismaService）
├── providers/
│   ├── jwt.provider.ts                 # JWT/RefreshToken 签发和验证
│   ├── redis-session.provider.ts       # Redis 会话 CRUD
│   └── login-failure.provider.ts       # 失败计数和锁定管理
├── dtos/
│   ├── login.dto.ts                    # LoginRequest、LoginResponse
│   ├── refresh.dto.ts                  # RefreshRequest、RefreshResponse
│   └── index.ts                        # DTO 重导出
├── guards/
│   └── jwt-auth.guard.ts               # JWT 认证守卫（供后续 Task 用）
├── types.ts                            # TokenPayload、Session 等内部类型
├── index.ts                            # 模块导出
└── __tests__/
    ├── auth.service.spec.ts            # Service 单元测试
    ├── jwt.provider.spec.ts            # JwtProvider 单元测试
    ├── redis-session.provider.spec.ts  # SessionProvider 单元测试
    └── login-failure.provider.spec.ts  # FailureProvider 单元测试
```

### 修改现有文件

```
apps/api/src/
├── app.module.ts                       # 导入 AuthModule + RedisModule（新建）
└── config/
    └── redis.config.ts                 # 新建 Redis 配置（导出 redisConfig）

apps/api/package.json                   # 添加 @nestjs/jwt、redis 依赖

packages/shared/src/types.ts            # 检查/补充 LoginRequest、LoginResponse 等类型
```

---

## Task Decomposition

### Task 1: 环境和依赖准备

**Files:**
- Modify: `apps/api/package.json`
- Create: `apps/api/src/config/redis.config.ts`

**Interfaces:**
- Produces: `redisConfig: { host, port, db, password, keyPrefix }`
- Produces: `@nestjs/jwt` 和 `redis` npm 包可用

**Steps:**

- [ ] Step 1.1: 检查 package.json 中的依赖
```bash
cd /Users/zero/projects/Sekiro && cat apps/api/package.json | grep -E "@nestjs/jwt|redis|bcrypt"
```
预期：看到 bcrypt 已有，但没有 @nestjs/jwt 和 redis

- [ ] Step 1.2: 添加依赖到 package.json
编辑 `apps/api/package.json`，在 `dependencies` 中添加：
```json
"@nestjs/jwt": "^11.1.0",
"redis": "^4.7.0",
```

- [ ] Step 1.3: 安装依赖
```bash
cd /Users/zero/projects/Sekiro && pnpm install
```
预期：所有包安装成功

- [ ] Step 1.4: 创建 Redis 配置文件
创建 `apps/api/src/config/redis.config.ts`：
```typescript
export interface RedisConfig {
  host: string;
  port: number;
  db: number;
  password?: string;
  keyPrefix: string;
}

export const redisConfig: RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  db: parseInt(process.env.REDIS_DB || '0', 10),
  password: process.env.REDIS_PASSWORD,
  keyPrefix: 'sekiro:',
};
```

- [ ] Step 1.5: 验证依赖可导入
运行：
```bash
cd /Users/zero/projects/Sekiro/apps/api && node -e "require('@nestjs/jwt'); require('redis'); console.log('OK')"
```
预期：输出 "OK"

- [ ] Step 1.6: Commit
```bash
cd /Users/zero/projects/Sekiro && git add apps/api/package.json apps/api/src/config/redis.config.ts && git commit -m "chore: add @nestjs/jwt and redis dependencies"
```

---

### Task 2: 类型定义和 DTO

**Files:**
- Create: `apps/api/src/modules/auth/types.ts`
- Create: `apps/api/src/modules/auth/dtos/login.dto.ts`
- Create: `apps/api/src/modules/auth/dtos/refresh.dto.ts`
- Create: `apps/api/src/modules/auth/dtos/index.ts`
- Verify: `packages/shared/src/types.ts`

**Interfaces:**
- Consumes: `@sekiro/shared` 中的 LoginRequest、LoginResponse、User、MenuNode、CommonStatus
- Produces: TokenPayload、RefreshTokenPayload、Session、内部类型定义

**Steps:**

- [ ] Step 2.1: 检查 @sekiro/shared 中是否有 LoginRequest 和 LoginResponse
```bash
cd /Users/zero/projects/Sekiro && grep -n "LoginRequest\|LoginResponse" packages/shared/src/types.ts | head -20
```

- [ ] Step 2.2: 如果 @sekiro/shared 中没有，在 packages/shared/src/types.ts 中添加
```typescript
// 追加到 packages/shared/src/types.ts
export interface LoginRequest {
  username: string;
  password: string;
  remember?: boolean;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
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

// 确保 User 和 MenuNode 已定义
export interface User {
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

- [ ] Step 2.3: 创建 auth/types.ts（内部类型）
创建 `apps/api/src/modules/auth/types.ts`：
```typescript
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

- [ ] Step 2.4: 创建 auth/dtos/login.dto.ts
创建 `apps/api/src/modules/auth/dtos/login.dto.ts`：
```typescript
import { IsString, IsOptional, IsBoolean, Length, MaxLength } from 'class-validator';
import type { LoginRequest as ILoginRequest, LoginResponse } from '@sekiro/shared';

export class LoginDto implements ILoginRequest {
  @IsString()
  @Length(3, 32, { message: 'username 必须 3-32 位' })
  username: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsBoolean()
  remember?: boolean;
}

export { LoginResponse };
```

- [ ] Step 2.5: 创建 auth/dtos/refresh.dto.ts
创建 `apps/api/src/modules/auth/dtos/refresh.dto.ts`：
```typescript
import { IsString } from 'class-validator';
import type { RefreshRequest, RefreshResponse } from '@sekiro/shared';

export class RefreshDto implements RefreshRequest {
  @IsString()
  refreshToken: string;
}

export { RefreshResponse };
```

- [ ] Step 2.6: 创建 auth/dtos/index.ts
创建 `apps/api/src/modules/auth/dtos/index.ts`：
```typescript
export * from './login.dto';
export * from './refresh.dto';
```

- [ ] Step 2.7: Commit
```bash
cd /Users/zero/projects/Sekiro && git add packages/shared/src/types.ts apps/api/src/modules/auth/types.ts apps/api/src/modules/auth/dtos/ && git commit -m "feat: add auth types and DTOs"
```

---

### Task 3: JwtProvider（Token 签发和验证）

**Files:**
- Create: `apps/api/src/modules/auth/providers/jwt.provider.ts`
- Create: `apps/api/src/modules/auth/providers/__tests__/jwt.provider.spec.ts`

**Interfaces:**
- Consumes: `@nestjs/jwt`、TokenPayload、RefreshTokenPayload
- Produces: 
  - `JwtProvider.signToken(payload): { token: string; expiresIn: number }`
  - `JwtProvider.verifyToken(token): TokenPayload | null`
  - `JwtProvider.signRefreshToken(payload): { refreshToken: string; expiresIn: number }`
  - `JwtProvider.verifyRefreshToken(token): RefreshTokenPayload | null`

**Steps:**

- [ ] Step 3.1: 写失败测试
创建 `apps/api/src/modules/auth/providers/__tests__/jwt.provider.spec.ts`：
```typescript
import { JwtProvider } from '../jwt.provider';

describe('JwtProvider', () => {
  let provider: JwtProvider;

  beforeEach(() => {
    const jwtService = {
      sign: jest.fn((payload, options) => 'mock.token.string'),
      verify: jest.fn((token) => ({ sub: 1, username: 'test' })),
    };
    provider = new JwtProvider(jwtService as any);
  });

  it('should sign a token with 2h expiry', () => {
    const payload = { sub: 1, username: 'admin', roles: ['admin'] };
    const result = provider.signToken(payload);
    expect(result.token).toBeDefined();
    expect(result.expiresIn).toBe(7200);
  });

  it('should sign a refresh token with 30d expiry', () => {
    const payload = { sub: 1, username: 'admin' };
    const result = provider.signRefreshToken(payload);
    expect(result.refreshToken).toBeDefined();
    expect(result.expiresIn).toBe(2592000);
  });

  it('should verify a valid token', () => {
    const token = 'valid.jwt.token';
    const result = provider.verifyToken(token);
    expect(result).toBeDefined();
    expect(result?.sub).toBe(1);
  });

  it('should return null for invalid token', () => {
    const jwtService = {
      verify: jest.fn(() => { throw new Error('Invalid'); }),
    };
    const providerWithError = new JwtProvider(jwtService as any);
    const result = providerWithError.verifyToken('invalid.token');
    expect(result).toBeNull();
  });
});
```

- [ ] Step 3.2: 运行测试确认失败
```bash
cd /Users/zero/projects/Sekiro/apps/api && pnpm test -- jwt.provider.spec.ts 2>&1 | head -30
```
预期：FAIL，找不到 JwtProvider

- [ ] Step 3.3: 实现 JwtProvider
创建 `apps/api/src/modules/auth/providers/jwt.provider.ts`：
```typescript
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenPayload, RefreshTokenPayload } from '../types';

@Injectable()
export class JwtProvider {
  private readonly jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
  private readonly refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || 'refresh-secret-key';

  constructor(private readonly jwtService: JwtService) {}

  signToken(payload: Omit<TokenPayload, 'iat' | 'exp'>) {
    const token = this.jwtService.sign(payload, {
      secret: this.jwtSecret,
      expiresIn: '2h',
    });
    return {
      token,
      expiresIn: 7200, // 2 hours in seconds
    };
  }

  verifyToken(token: string): TokenPayload | null {
    try {
      const payload = this.jwtService.verify<TokenPayload>(token, {
        secret: this.jwtSecret,
      });
      return payload;
    } catch (error) {
      return null;
    }
  }

  signRefreshToken(payload: Omit<RefreshTokenPayload, 'iat' | 'exp' | 'type'>) {
    const refreshToken = this.jwtService.sign(
      { ...payload, type: 'refresh' },
      {
        secret: this.refreshTokenSecret,
        expiresIn: '30d',
      }
    );
    return {
      refreshToken,
      expiresIn: 2592000, // 30 days in seconds
    };
  }

  verifyRefreshToken(token: string): RefreshTokenPayload | null {
    try {
      const payload = this.jwtService.verify<RefreshTokenPayload>(token, {
        secret: this.refreshTokenSecret,
      });
      if (payload.type !== 'refresh') {
        return null;
      }
      return payload;
    } catch (error) {
      return null;
    }
  }
}
```

- [ ] Step 3.4: 运行测试确认通过
```bash
cd /Users/zero/projects/Sekiro/apps/api && pnpm test -- jwt.provider.spec.ts 2>&1
```
预期：PASS

- [ ] Step 3.5: Commit
```bash
cd /Users/zero/projects/Sekiro && git add apps/api/src/modules/auth/providers/jwt.provider.ts apps/api/src/modules/auth/providers/__tests__/jwt.provider.spec.ts && git commit -m "feat: implement JwtProvider for token signing and verification"
```

---

### Task 4: RedisSessionProvider（会话管理）

**Files:**
- Create: `apps/api/src/modules/auth/providers/redis-session.provider.ts`
- Create: `apps/api/src/modules/auth/providers/__tests__/redis-session.provider.spec.ts`
- Create: `apps/api/src/redis.module.ts`（全局 Redis 模块）

**Interfaces:**
- Consumes: `redis`、Session 类型、redisConfig
- Produces:
  - `RedisSessionProvider.createSession(sessionId, session, ttl): Promise<void>`
  - `RedisSessionProvider.getSession(sessionId): Promise<Session | null>`
  - `RedisSessionProvider.updateSessionToken(sessionId, newToken): Promise<void>`
  - `RedisSessionProvider.deleteSession(sessionId): Promise<void>`

**Steps:**

- [ ] Step 4.1: 创建全局 Redis 模块
创建 `apps/api/src/redis.module.ts`：
```typescript
import { Global, Module } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { redisConfig } from './config/redis.config';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: async (): Promise<RedisClientType> => {
        const client = createClient({
          host: redisConfig.host,
          port: redisConfig.port,
          db: redisConfig.db,
          password: redisConfig.password,
        });
        await client.connect();
        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
```

- [ ] Step 4.2: 写 RedisSessionProvider 测试
创建 `apps/api/src/modules/auth/providers/__tests__/redis-session.provider.spec.ts`：
```typescript
import { RedisSessionProvider } from '../redis-session.provider';
import { Session } from '../../types';

describe('RedisSessionProvider', () => {
  let provider: RedisSessionProvider;
  let mockRedis: any;

  beforeEach(() => {
    mockRedis = {
      setEx: jest.fn().mockResolvedValue('OK'),
      get: jest.fn(),
      del: jest.fn().mockResolvedValue(1),
    };
    provider = new RedisSessionProvider(mockRedis);
  });

  it('should create a session with TTL', async () => {
    const session: Session = {
      userId: 1,
      username: 'admin',
      token: 'jwt.token',
      refreshToken: 'refresh.token',
      remember: true,
      ip: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      expiresAt: new Date().toISOString(),
    };
    await provider.createSession('session-123', session, 2592000);
    expect(mockRedis.setEx).toHaveBeenCalledWith(
      'sekiro:session:session-123',
      2592000,
      expect.stringContaining('admin')
    );
  });

  it('should get a session', async () => {
    mockRedis.get.mockResolvedValue(
      JSON.stringify({ userId: 1, username: 'admin' })
    );
    const result = await provider.getSession('session-123');
    expect(result?.userId).toBe(1);
    expect(result?.username).toBe('admin');
  });

  it('should return null for non-existent session', async () => {
    mockRedis.get.mockResolvedValue(null);
    const result = await provider.getSession('non-existent');
    expect(result).toBeNull();
  });

  it('should delete a session', async () => {
    await provider.deleteSession('session-123');
    expect(mockRedis.del).toHaveBeenCalledWith('sekiro:session:session-123');
  });
});
```

- [ ] Step 4.3: 运行测试确认失败
```bash
cd /Users/zero/projects/Sekiro/apps/api && pnpm test -- redis-session.provider.spec.ts 2>&1 | head -20
```
预期：FAIL，找不到 RedisSessionProvider

- [ ] Step 4.4: 实现 RedisSessionProvider
创建 `apps/api/src/modules/auth/providers/redis-session.provider.ts`：
```typescript
import { Injectable, Inject } from '@nestjs/common';
import { RedisClientType } from 'redis';
import { Session } from '../types';
import { REDIS_CLIENT } from '../../redis.module';

@Injectable()
export class RedisSessionProvider {
  constructor(@Inject(REDIS_CLIENT) private redisClient: RedisClientType) {}

  async createSession(
    sessionId: string,
    session: Session,
    ttl: number = 2592000 // 30 days
  ): Promise<void> {
    const key = `sekiro:session:${sessionId}`;
    const value = JSON.stringify(session);
    await this.redisClient.setEx(key, ttl, value);
  }

  async getSession(sessionId: string): Promise<Session | null> {
    const key = `sekiro:session:${sessionId}`;
    const value = await this.redisClient.get(key);
    if (!value) {
      return null;
    }
    return JSON.parse(value) as Session;
  }

  async updateSessionToken(sessionId: string, newToken: string): Promise<void> {
    const key = `sekiro:session:${sessionId}`;
    const session = await this.getSession(sessionId);
    if (!session) {
      return;
    }
    session.token = newToken;
    session.lastActiveAt = new Date().toISOString();
    const ttl = await this.redisClient.ttl(key);
    if (ttl > 0) {
      await this.redisClient.setEx(key, ttl, JSON.stringify(session));
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    const key = `sekiro:session:${sessionId}`;
    await this.redisClient.del(key);
  }
}
```

- [ ] Step 4.5: 运行测试确认通过
```bash
cd /Users/zero/projects/Sekiro/apps/api && pnpm test -- redis-session.provider.spec.ts 2>&1
```
预期：PASS

- [ ] Step 4.6: Commit
```bash
cd /Users/zero/projects/Sekiro && git add apps/api/src/redis.module.ts apps/api/src/modules/auth/providers/redis-session.provider.ts apps/api/src/modules/auth/providers/__tests__/redis-session.provider.spec.ts && git commit -m "feat: implement RedisSessionProvider and RedisModule"
```

---

### Task 5: LoginFailureProvider（失败锁定管理）

**Files:**
- Create: `apps/api/src/modules/auth/providers/login-failure.provider.ts`
- Create: `apps/api/src/modules/auth/providers/__tests__/login-failure.provider.spec.ts`

**Interfaces:**
- Consumes: `redis`、REDIS_CLIENT
- Produces:
  - `LoginFailureProvider.incrementFailure(userId): Promise<number>` → 返回当前失败次数
  - `LoginFailureProvider.getFailureCount(userId): Promise<number>`
  - `LoginFailureProvider.lockUser(userId, durationSeconds): Promise<void>`
  - `LoginFailureProvider.isLocked(userId): Promise<boolean>`
  - `LoginFailureProvider.clearFailure(userId): Promise<void>`

**Steps:**

- [ ] Step 5.1: 写失败测试
创建 `apps/api/src/modules/auth/providers/__tests__/login-failure.provider.spec.ts`：
```typescript
import { LoginFailureProvider } from '../login-failure.provider';

describe('LoginFailureProvider', () => {
  let provider: LoginFailureProvider;
  let mockRedis: any;

  beforeEach(() => {
    mockRedis = {
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      ttl: jest.fn().mockResolvedValue(1800),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };
    provider = new LoginFailureProvider(mockRedis);
  });

  it('should increment failure count and return new count', async () => {
    mockRedis.incr.mockResolvedValueOnce(1);
    mockRedis.incr.mockResolvedValueOnce(2);
    
    let count = await provider.incrementFailure(1);
    expect(count).toBe(1);
    
    count = await provider.incrementFailure(1);
    expect(count).toBe(2);
  });

  it('should set TTL on first failure', async () => {
    mockRedis.incr.mockResolvedValueOnce(1);
    await provider.incrementFailure(1);
    expect(mockRedis.expire).toHaveBeenCalledWith('sekiro:login:failure:1', 1800);
  });

  it('should lock user for 30 minutes', async () => {
    await provider.lockUser(1, 1800);
    expect(mockRedis.set).toHaveBeenCalledWith(
      'sekiro:login:locked:1',
      'true',
      { EX: 1800 }
    );
  });

  it('should check if user is locked', async () => {
    mockRedis.get.mockResolvedValueOnce('true');
    let isLocked = await provider.isLocked(1);
    expect(isLocked).toBe(true);

    mockRedis.get.mockResolvedValueOnce(null);
    isLocked = await provider.isLocked(1);
    expect(isLocked).toBe(false);
  });

  it('should clear failure count', async () => {
    await provider.clearFailure(1);
    expect(mockRedis.del).toHaveBeenCalledWith('sekiro:login:failure:1');
  });
});
```

- [ ] Step 5.2: 运行测试确认失败
```bash
cd /Users/zero/projects/Sekiro/apps/api && pnpm test -- login-failure.provider.spec.ts 2>&1 | head -20
```
预期：FAIL

- [ ] Step 5.3: 实现 LoginFailureProvider
创建 `apps/api/src/modules/auth/providers/login-failure.provider.ts`：
```typescript
import { Injectable, Inject } from '@nestjs/common';
import { RedisClientType } from 'redis';
import { REDIS_CLIENT } from '../../redis.module';

const FAILURE_TTL = 30 * 60; // 30 minutes
const MAX_FAILURES = 5;

@Injectable()
export class LoginFailureProvider {
  constructor(@Inject(REDIS_CLIENT) private redisClient: RedisClientType) {}

  async incrementFailure(userId: number): Promise<number> {
    const key = `sekiro:login:failure:${userId}`;
    const count = await this.redisClient.incr(key);
    
    // Set TTL on first increment
    if (count === 1) {
      await this.redisClient.expire(key, FAILURE_TTL);
    }

    return count;
  }

  async getFailureCount(userId: number): Promise<number> {
    const key = `sekiro:login:failure:${userId}`;
    const count = await this.redisClient.get(key);
    return count ? parseInt(count, 10) : 0;
  }

  async lockUser(userId: number, durationSeconds: number = FAILURE_TTL): Promise<void> {
    const key = `sekiro:login:locked:${userId}`;
    await this.redisClient.set(key, 'true', { EX: durationSeconds });
  }

  async isLocked(userId: number): Promise<boolean> {
    const key = `sekiro:login:locked:${userId}`;
    const value = await this.redisClient.get(key);
    return value === 'true';
  }

  async clearFailure(userId: number): Promise<void> {
    const failureKey = `sekiro:login:failure:${userId}`;
    const lockedKey = `sekiro:login:locked:${userId}`;
    await this.redisClient.del([failureKey, lockedKey]);
  }

  getMaxFailures(): number {
    return MAX_FAILURES;
  }

  getFailureTtl(): number {
    return FAILURE_TTL;
  }
}
```

- [ ] Step 5.4: 运行测试确认通过
```bash
cd /Users/zero/projects/Sekiro/apps/api && pnpm test -- login-failure.provider.spec.ts 2>&1
```
预期：PASS

- [ ] Step 5.5: Commit
```bash
cd /Users/zero/projects/Sekiro && git add apps/api/src/modules/auth/providers/login-failure.provider.ts apps/api/src/modules/auth/providers/__tests__/login-failure.provider.spec.ts && git commit -m "feat: implement LoginFailureProvider for failure tracking and account locking"
```

---

### Task 6: AuthService（业务编排）

**Files:**
- Create: `apps/api/src/modules/auth/services/auth.service.ts`
- Create: `apps/api/src/modules/auth/services/__tests__/auth.service.spec.ts`

**Interfaces:**
- Consumes: JwtProvider、RedisSessionProvider、LoginFailureProvider、PrismaService
- Produces:
  - `AuthService.login(request, ipAddress, userAgent): Promise<LoginResponse>`
  - `AuthService.refresh(refreshToken): Promise<RefreshResponse>`
  - `AuthService.logout(userId, sessionId): Promise<void>`
  - `AuthService.getUserPermissions(userId): Promise<string[]>`
  - `AuthService.buildMenuTree(userId): Promise<MenuNode[]>`

**Steps:**

- [ ] Step 6.1: 写 AuthService 核心测试
创建 `apps/api/src/modules/auth/services/__tests__/auth.service.spec.ts`（大文件，分段）：

**Part A: Setup and login success test**
```typescript
import { AuthService } from '../auth.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtProvider } from '../../providers/jwt.provider';
import { RedisSessionProvider } from '../../providers/redis-session.provider';
import { LoginFailureProvider } from '../../providers/login-failure.provider';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: any;
  let jwtProvider: any;
  let redisSessionProvider: any;
  let loginFailureProvider: any;

  beforeEach(() => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      loginLog: {
        create: jest.fn(),
      },
      userRole: {
        findMany: jest.fn(),
      },
      role: {
        findMany: jest.fn(),
      },
      roleMenu: {
        findMany: jest.fn(),
      },
      menu: {
        findMany: jest.fn(),
      },
    };
    jwtProvider = {
      signToken: jest.fn().mockReturnValue({ token: 'jwt.token', expiresIn: 7200 }),
      signRefreshToken: jest.fn().mockReturnValue({ refreshToken: 'rt.token', expiresIn: 2592000 }),
      verifyRefreshToken: jest.fn(),
    };
    redisSessionProvider = {
      createSession: jest.fn(),
      getSession: jest.fn(),
      updateSessionToken: jest.fn(),
      deleteSession: jest.fn(),
    };
    loginFailureProvider = {
      incrementFailure: jest.fn(),
      getFailureCount: jest.fn(),
      isLocked: jest.fn(),
      lockUser: jest.fn(),
      clearFailure: jest.fn(),
      getMaxFailures: jest.fn().mockReturnValue(5),
    };

    service = new AuthService(
      prismaService,
      jwtProvider,
      redisSessionProvider,
      loginFailureProvider
    );
  });

  describe('login', () => {
    it('should successfully login and return token + user + permissions + menus', async () => {
      const loginRequest = { username: 'admin', password: 'admin123', remember: false };
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const mockUser = {
        id: 1,
        username: 'admin',
        password_hash: hashedPassword,
        nickname: 'Administrator',
        email: 'admin@example.com',
        status: 'enabled',
        deptId: 1,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      loginFailureProvider.isLocked.mockResolvedValue(false);
      
      // Mock permission and menu queries
      prismaService.userRole.findMany.mockResolvedValue([
        { roleId: 1 },
      ]);
      prismaService.role.findMany.mockResolvedValue([
        { id: 1, code: 'admin' },
      ]);
      prismaService.roleMenu.findMany.mockResolvedValue([
        { menuId: 1 },
        { menuId: 2 },
      ]);
      prismaService.menu.findMany.mockResolvedValue([
        { id: 1, title: 'User', permission: 'system:user:list', parentId: null, type: 'menu', sort: 1, visible: true, status: 'enabled' },
        { id: 2, title: 'Create', permission: 'system:user:create', parentId: 1, type: 'button', sort: 1, visible: true, status: 'enabled' },
      ]);

      const result = await service.login(loginRequest, '127.0.0.1', 'Mozilla/5.0');

      expect(result.token).toBe('jwt.token');
      expect(result.refreshToken).toBe('rt.token');
      expect(result.expiresIn).toBe(7200);
      expect(result.user.username).toBe('admin');
      expect(result.permissions).toBeDefined();
      expect(result.menus).toBeDefined();
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { last_login_at: expect.any(Date) },
      });
    });
  });
});
```

- [ ] Step 6.2: 写更多失败场景测试
在 auth.service.spec.ts 中继续添加：
```typescript
    it('should return error if user not found', async () => {
      const loginRequest = { username: 'nonexistent', password: 'pwd' };
      prismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.login(loginRequest, '127.0.0.1', 'UA');
      expect(result.code).toBe(1);
      expect(result.message).toContain('账号或密码错误');
    });

    it('should return error if user status is disabled', async () => {
      const loginRequest = { username: 'admin', password: 'admin123' };
      const mockUser = {
        id: 1,
        username: 'admin',
        password_hash: 'hash',
        status: 'disabled',
      };
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.login(loginRequest, '127.0.0.1', 'UA');
      expect(result.code).toBe(1);
      expect(result.message).toContain('已停用');
    });

    it('should return error if account is locked', async () => {
      const loginRequest = { username: 'admin', password: 'admin123' };
      const mockUser = {
        id: 1,
        username: 'admin',
        password_hash: 'hash',
        status: 'enabled',
      };
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      loginFailureProvider.isLocked.mockResolvedValue(true);

      const result = await service.login(loginRequest, '127.0.0.1', 'UA');
      expect(result.code).toBe(1);
      expect(result.message).toContain('已锁定');
    });

    it('should increment failure and lock after 5 attempts', async () => {
      const loginRequest = { username: 'admin', password: 'wrongpwd' };
      const mockUser = {
        id: 1,
        username: 'admin',
        password_hash: await bcrypt.hash('correctpwd', 10),
        status: 'enabled',
      };
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      loginFailureProvider.isLocked.mockResolvedValue(false);
      loginFailureProvider.incrementFailure.mockResolvedValueOnce(5);

      const result = await service.login(loginRequest, '127.0.0.1', 'UA');
      expect(result.code).toBe(1);
      expect(result.message).toContain('还剩 0 次');
      expect(loginFailureProvider.lockUser).toHaveBeenCalledWith(1, 1800);
    });
});
```

- [ ] Step 6.3: 运行测试确认失败
```bash
cd /Users/zero/projects/Sekiro/apps/api && pnpm test -- auth.service.spec.ts 2>&1 | head -30
```
预期：FAIL

- [ ] Step 6.4: 实现 AuthService
创建 `apps/api/src/modules/auth/services/auth.service.ts`：
```typescript
import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtProvider } from '../providers/jwt.provider';
import { RedisSessionProvider } from '../providers/redis-session.provider';
import { LoginFailureProvider } from '../providers/login-failure.provider';
import type { LoginRequest, LoginResponse, MenuNode, User } from '@sekiro/shared';
import type { RefreshResponse } from '@sekiro/shared';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prismaService: PrismaService,
    private jwtProvider: JwtProvider,
    private redisSessionProvider: RedisSessionProvider,
    private loginFailureProvider: LoginFailureProvider,
  ) {}

  async login(
    request: LoginRequest,
    ipAddress: string,
    userAgent: string,
  ): Promise<LoginResponse | { code: number; message: string }> {
    const { username, password, remember } = request;

    // 1. 查询用户
    const user = await this.prismaService.user.findUnique({
      where: { username },
    });
    if (!user) {
      await this.prismaService.loginLog.create({
        data: {
          username,
          result: 'fail',
          message: '账号不存在',
          ip: ipAddress,
          browser: userAgent,
          os: userAgent,
        },
      });
      return { code: 1, message: '账号或密码错误' };
    }

    // 2. 检查账号状态
    if (user.status === 'disabled') {
      await this.prismaService.loginLog.create({
        data: {
          username,
          result: 'fail',
          message: '账号已停用',
          ip: ipAddress,
          browser: userAgent,
          os: userAgent,
        },
      });
      return { code: 1, message: '账号已停用' };
    }

    // 3. 检查账号是否被锁定
    const isLocked = await this.loginFailureProvider.isLocked(user.id);
    if (isLocked) {
      await this.prismaService.loginLog.create({
        data: {
          username,
          result: 'fail',
          message: '账号已锁定',
          ip: ipAddress,
          browser: userAgent,
          os: userAgent,
        },
      });
      return { code: 1, message: '账号已锁定 30 分钟' };
    }

    // 4. 验证密码
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      const failureCount = await this.loginFailureProvider.incrementFailure(user.id);
      const maxFailures = this.loginFailureProvider.getMaxFailures();
      const remainTimes = maxFailures - failureCount;

      if (failureCount >= maxFailures) {
        await this.loginFailureProvider.lockUser(user.id, 1800); // 30 minutes
      }

      await this.prismaService.loginLog.create({
        data: {
          username,
          result: 'fail',
          message: '密码错误',
          ip: ipAddress,
          browser: userAgent,
          os: userAgent,
        },
      });

      return {
        code: 1,
        message: remainTimes > 0 ? `密码错误，还剩 ${remainTimes} 次` : `密码错误，账号已锁定 30 分钟`,
      };
    }

    // 5. 验证成功！清除失败计数
    await this.loginFailureProvider.clearFailure(user.id);

    // 6. 计算权限和菜单
    const permissions = await this.getUserPermissions(user.id);
    const menus = await this.buildMenuTree(user.id);

    // 7. 签发 Token
    const { token, expiresIn } = this.jwtProvider.signToken({
      sub: user.id,
      username: user.username,
      roles: permissions.map((p) => p.split(':')[0]).filter((v, i, a) => a.indexOf(v) === i),
    });

    const { refreshToken } = this.jwtProvider.signRefreshToken({
      sub: user.id,
      username: user.username,
    });

    // 8. 创建 Session
    const sessionId = uuidv4();
    const session = {
      userId: user.id,
      username: user.username,
      token,
      refreshToken,
      remember: remember || false,
      ip: ipAddress,
      userAgent,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    };
    await this.redisSessionProvider.createSession(sessionId, session, 2592000);

    // 9. 更新用户登录时间并写日志
    await this.prismaService.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });
    await this.prismaService.loginLog.create({
      data: {
        username,
        result: 'success',
        message: '登录成功',
        ip: ipAddress,
        browser: userAgent,
        os: userAgent,
      },
    });

    // 10. 返回响应
    return {
      code: 0,
      data: {
        token,
        refreshToken,
        expiresIn,
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          status: user.status as any,
          deptId: user.deptId,
        },
        permissions,
        menus,
      },
    } as any;
  }

  async refresh(refreshToken: string): Promise<RefreshResponse | { code: number; message: string }> {
    // 1. 验证 RefreshToken
    const payload = this.jwtProvider.verifyRefreshToken(refreshToken);
    if (!payload) {
      return { code: 401, message: 'Token 已过期或无效，请重新登录' };
    }

    // 2. 查询 Session
    const session = await this.redisSessionProvider.getSession(refreshToken);
    if (!session) {
      return { code: 401, message: 'Session 已失效' };
    }

    // 3. 签发新 JWT
    const { token, expiresIn } = this.jwtProvider.signToken({
      sub: payload.sub,
      username: payload.username,
      roles: [],
    });

    // 4. 更新 Session
    await this.redisSessionProvider.updateSessionToken(refreshToken, token);

    return {
      code: 0,
      data: { token, expiresIn },
    } as any;
  }

  async logout(userId: number, sessionId?: string): Promise<void> {
    if (sessionId) {
      await this.redisSessionProvider.deleteSession(sessionId);
    }
    await this.loginFailureProvider.clearFailure(userId);
  }

  async getUserPermissions(userId: number): Promise<string[]> {
    const userRoles = await this.prismaService.userRole.findMany({
      where: { userId },
    });

    if (userRoles.length === 0) {
      return [];
    }

    const roleIds = userRoles.map((ur) => ur.roleId);
    const roleMenus = await this.prismaService.roleMenu.findMany({
      where: { roleId: { in: roleIds } },
      distinct: ['menuId'],
    });

    const menuIds = roleMenus.map((rm) => rm.menuId);
    const menus = await this.prismaService.menu.findMany({
      where: {
        id: { in: menuIds },
        type: 'button',
        status: 'enabled',
      },
    });

    return menus.map((m) => m.permission).filter(Boolean) as string[];
  }

  async buildMenuTree(userId: number): Promise<MenuNode[]> {
    const userRoles = await this.prismaService.userRole.findMany({
      where: { userId },
    });

    if (userRoles.length === 0) {
      return [];
    }

    const roleIds = userRoles.map((ur) => ur.roleId);
    const roleMenus = await this.prismaService.roleMenu.findMany({
      where: { roleId: { in: roleIds } },
      distinct: ['menuId'],
    });

    const menuIds = roleMenus.map((rm) => rm.menuId);
    const menus = await this.prismaService.menu.findMany({
      where: {
        id: { in: menuIds },
        status: 'enabled',
      },
      orderBy: { sort: 'asc' },
    });

    return this.buildTree(menus as MenuNode[]);
  }

  private buildTree(items: MenuNode[], parentId: number | null = null): MenuNode[] {
    return items
      .filter((item) => item.parentId === parentId)
      .map((item) => ({
        ...item,
        children: this.buildTree(items, item.id),
      }));
  }
}
```

- [ ] Step 6.5: 运行测试确认通过
```bash
cd /Users/zero/projects/Sekiro/apps/api && pnpm test -- auth.service.spec.ts 2>&1
```
预期：全部通过

- [ ] Step 6.6: Commit
```bash
cd /Users/zero/projects/Sekiro && git add apps/api/src/modules/auth/services/ && git commit -m "feat: implement AuthService with login, refresh, and logout logic"
```

---

### Task 7: AuthController（HTTP 接口层）

**Files:**
- Create: `apps/api/src/modules/auth/auth.controller.ts`
- Create: `apps/api/src/modules/auth/guards/jwt-auth.guard.ts`

**Interfaces:**
- Consumes: AuthService、LoginDto、RefreshDto、JwtProvider
- Produces: POST /auth/login、POST /auth/refresh、POST /auth/logout 端点

**Steps:**

- [ ] Step 7.1: 创建 JWT 认证守卫
创建 `apps/api/src/modules/auth/guards/jwt-auth.guard.ts`：
```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtProvider } from '../providers/jwt.provider';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtProvider: JwtProvider) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException({ code: 401, message: '未认证' });
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtProvider.verifyToken(token);

    if (!payload) {
      throw new UnauthorizedException({ code: 401, message: 'Token 已过期或无效' });
    }

    request.user = payload;
    return true;
  }
}
```

- [ ] Step 7.2: 创建 AuthController
创建 `apps/api/src/modules/auth/auth.controller.ts`：
```typescript
import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { AuthService } from './services/auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto, LoginResponse, RefreshDto, RefreshResponse } from './dtos';
import type { ApiResponse } from '@sekiro/shared';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() loginDto: LoginDto, @Req() req: any): Promise<ApiResponse<LoginResponse>> {
    const ipAddress = req.ip || '0.0.0.0';
    const userAgent = req.headers['user-agent'] || '';
    const result = await this.authService.login(loginDto, ipAddress, userAgent);

    if ('data' in result) {
      return {
        code: 0,
        message: '登录成功',
        data: result.data,
      };
    }
    return {
      code: result.code,
      message: result.message,
      data: null,
    };
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Body() refreshDto: RefreshDto): Promise<ApiResponse<RefreshResponse>> {
    const result = await this.authService.refresh(refreshDto.refreshToken);

    if ('data' in result) {
      return {
        code: 0,
        message: 'Token 刷新成功',
        data: result.data,
      };
    }
    return {
      code: result.code,
      message: result.message,
      data: null,
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  async logout(@Req() req: any): Promise<ApiResponse<null>> {
    const userId = req.user?.sub;
    await this.authService.logout(userId);
    return {
      code: 0,
      message: '登出成功',
      data: null,
    };
  }
}
```

- [ ] Step 7.3: 创建 auth.module.ts
创建 `apps/api/src/modules/auth/auth.module.ts`：
```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { JwtProvider } from './providers/jwt.provider';
import { RedisSessionProvider } from './providers/redis-session.provider';
import { LoginFailureProvider } from './providers/login-failure.provider';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    JwtModule.register({ secret: process.env.JWT_SECRET || 'your-secret-key' }),
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtProvider, RedisSessionProvider, LoginFailureProvider],
  exports: [AuthService, JwtProvider],
})
export class AuthModule {}
```

- [ ] Step 7.4: 在 AppModule 中注册 AuthModule
编辑 `apps/api/src/main.ts`，将 AuthModule 导入：
```typescript
import { AuthModule } from './modules/auth/auth.module';
import { RedisModule } from './redis.module';

@Module({
  imports: [PrismaModule, RedisModule, AuthModule],
})
class AppModule {}
```

- [ ] Step 7.5: 验证接口可访问
```bash
cd /Users/zero/projects/Sekiro/apps/api && npx tsx src/main.ts &
sleep 2
curl -X POST http://localhost:3001/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}'
kill %1
```
预期：返回 token（或错误消息，表示接口已注册）

- [ ] Step 7.6: Commit
```bash
cd /Users/zero/projects/Sekiro && git add apps/api/src/modules/auth/ apps/api/src/main.ts apps/api/src/redis.module.ts && git commit -m "feat: implement AuthController and register AuthModule in AppModule"
```

---

### Task 8: 集成测试和验证

**Files:**
- Create: `apps/api/src/modules/auth/__tests__/auth.e2e.spec.ts`（可选，P1）

**Steps:**

- [ ] Step 8.1: 确认所有单元测试通过
```bash
cd /Users/zero/projects/Sekiro/apps/api && pnpm test 2>&1 | tail -30
```
预期：所有 auth 相关测试通过

- [ ] Step 8.2: 检查 TypeScript 编译
```bash
cd /Users/zero/projects/Sekiro/apps/api && pnpm typecheck
```
预期：0 errors

- [ ] Step 8.3: 验证模块导入
```bash
cd /Users/zero/projects/Sekiro/apps/api && npx tsx -e "import { AuthModule } from './src/modules/auth'; console.log('OK')"
```
预期：OK

- [ ] Step 8.4: 启动应用并手动测试登录接口
```bash
cd /Users/zero/projects/Sekiro && pnpm docker:up &
sleep 5
cd /Users/zero/projects/Sekiro/apps/api && pnpm dev &
sleep 5

# 测试登录
curl -X POST http://localhost:3001/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' | jq .

# 清理
kill %1 %2
pnpm docker:down
```
预期：返回 code=0 和 token + user + permissions + menus

- [ ] Step 8.5: Commit 最终代码
```bash
cd /Users/zero/projects/Sekiro && git add -A && git commit -m "feat: complete auth module with login, refresh, logout"
```

---

## Self-Review Checklist

✅ **Spec Coverage:**
- §4.3 三个接口：POST /auth/login、/auth/refresh、/auth/logout → Tasks 7
- §4.3.1 登录流程（失败锁定、权限、菜单树）→ Task 6
- §4.2 ApiResponse 格式 → Task 7
- §3.3 Session 存储（Redis）→ Task 4
- §5.3 不变量（不变量-6 停用用户不可登录）→ Task 6
- §7 安全规格（CON-5 密码、Token 不明文）→ Task 3、6
- §9.1 验收用例（TC-AUTH-01~04） → Task 6 测试

✅ **Placeholder Scan:**
- 没有 TBD、TODO
- 所有代码块完整
- 所有命令带预期输出

✅ **Type Consistency:**
- LoginResponse、RefreshResponse 来自 @sekiro/shared
- TokenPayload、Session 来自 auth/types.ts
- JwtProvider 和 RedisSessionProvider 接口一致

✅ **Scope Check:**
- 8 个独立 Task，每个可独立测试
- P0 必备功能全覆盖（登录、刷新、登出）
- P1 延后功能（/auth/me、captcha、e2e 测试）明确标记

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-07-05-auth-login-implementation.md`.**

**Two execution options:**

**1. Subagent-Driven (推荐)** - 我为每个 Task 派遣一个专业化的实现 subagent，Task 间自动审查，快速迭代，高质量

**2. Inline Execution** - 在当前 session 中逐个 Task 执行，中间有 checkpoint

**你倾向哪个方式？**
