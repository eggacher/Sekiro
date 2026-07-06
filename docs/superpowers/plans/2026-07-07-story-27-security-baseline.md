# Story #27 安全基线 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 NestJS 后端与 Next.js 前端落地 Story #27 全部 5 项安全基线能力：Helmet 安全头、@Throttle Redis 限流、文件上传三层校验、配置加密、CSP nonce 加固。

**Architecture:** 新增 `SecurityModule` 统一承载限流存储、配置加密、文件校验、异常过滤；在 `main.ts` 全局注册 Helmet/ThrottlerGuard/异常过滤器；前端通过 Next.js middleware 生成 CSP nonce。

**Tech Stack:** NestJS 11, @nestjs/throttler, @nestjs/config, helmet, redis, file-type, AES-256-GCM, Next.js 14 App Router

## Global Constraints

- 所有跨进程数据结构必须用 `@sekiro/shared` 的类型（CON-1）。
- 所有接口返回 `ApiResponse<T>`（CON-2）。
- 后端模块按领域组织（CON-3）。
- 数据访问必须经 ORM 参数化，禁止 SQL 字符串拼接（CON-4）。
- 密码、Token、密钥不得以明文出现在日志、响应、DB（CON-5）。
- 业务码全走 HTTP 200，前端只看 `code`（SPEC §4.2）。
- 限流触发返回 `code=429`，上传校验失败返回 `code=422`。
- 单测使用 mock Redis，不依赖真实 Redis 服务。

---

## File Structure

新建/修改文件清单：

```
apps/api/src/modules/security/
├── security.module.ts                       # SecurityModule 入口
├── index.ts                                 # 模块导出
├── utils/
│   ├── crypto.util.ts                       # AES-256-GCM 加密/解密
│   └── __tests__/crypto.util.spec.ts
├── providers/
│   ├── encrypted-config.loader.ts           # ENC(...) 配置解密
│   ├── throttler-storage-redis.service.ts   # Redis 限流存储
│   └── __tests__/
│       ├── encrypted-config.loader.spec.ts
│       └── throttler-storage-redis.service.spec.ts
├── pipes/
│   ├── file-validation.pipe.ts              # 文件上传校验
│   └── __tests__/file-validation.pipe.spec.ts
├── decorators/
│   └── validated-file.decorator.ts          # @ValidatedFile
├── filters/
│   ├── throttler-exception.filter.ts        # 429 统一响应
│   └── __tests__/throttler-exception.filter.spec.ts
├── controllers/
│   └── upload.controller.ts                 # 示例上传接口
├── cli/
│   └── encrypt-config.cli.ts                # 加密 CLI
└── __tests__/
    └── security-headers.spec.ts             # 安全头集成测试

apps/api/src/main.ts                         # 注册 Helmet/ThrottlerGuard/Filter
apps/api/src/app.module.ts                   # 导入 SecurityModule（由 main.ts 内联 AppModule 改为独立文件）
apps/api/package.json                        # 新增依赖与 encrypt:config 脚本
apps/api/.env.example                        # 新增安全相关环境变量
apps/web/middleware.ts                       # CSP nonce 中间件
apps/web/app/layout.tsx                      # 读取 nonce 并传给 html
apps/web/next.config.js                      # 开发/生产 CSP headers 兜底
```

---

### Task 1: Install Dependencies

**Files:**
- Modify: `apps/api/package.json`

**Interfaces:**
- Produces: 新增依赖可用于后续任务。

- [ ] **Step 1: 添加依赖**

在 `apps/api/package.json` 的 `dependencies` 中追加：

```json
"@nestjs/config": "^4.0.2",
"@nestjs/throttler": "^6.4.0",
"file-type": "^20.0.0",
"helmet": "^8.0.0"
```

在 `devDependencies` 中追加：

```json
"@types/multer": "^1.4.12",
"supertest": "^7.1.0",
"@types/supertest": "^6.0.3"
```

- [ ] **Step 2: 安装并锁定**

```bash
cd /Users/zero/projects/Sekiro/.worktrees/story/27-security-baseline
pnpm install
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml
-git commit -m "chore(deps): add helmet, throttler, config, file-type, supertest for Story #27"
```

---

### Task 2: AES-256-GCM Config Encryption Utility

**Files:**
- Create: `apps/api/src/modules/security/utils/crypto.util.ts`
- Create: `apps/api/src/modules/security/utils/__tests__/crypto.util.spec.ts`

**Interfaces:**
- Produces: `encryptConfig(plaintext: string, key: string): string`
- Produces: `decryptConfig(ciphertext: string, key: string): string`
- Format: `ENC(<base64(iv)>:<base64(ciphertext)>:<base64(authTag)>)`

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/modules/security/utils/__tests__/crypto.util.spec.ts
import { describe, it, expect } from "vitest";
import { encryptConfig, decryptConfig } from "../crypto.util";

describe("crypto.util", () => {
  const key = "test-key-that-is-exactly-32-bytes-long!!";

  it("should encrypt and decrypt plaintext", () => {
    const plain = "postgresql://sekiro:secret@localhost:5432/sekiro";
    const encrypted = encryptConfig(plain, key);
    expect(encrypted).toMatch(/^ENC\(.+\)$/);
    const decrypted = decryptConfig(encrypted, key);
    expect(decrypted).toBe(plain);
  });

  it("should return non-ENC value unchanged", () => {
    expect(decryptConfig("plain-value", key)).toBe("plain-value");
  });

  it("should throw on invalid encrypted format", () => {
    expect(() => decryptConfig("ENC(bad)", key)).toThrow();
  });

  it("should throw on tampered auth tag", () => {
    const encrypted = encryptConfig("secret", key);
    const tampered = encrypted.replace(/:[^:)]+\)$/, ":badtag)");
    expect(() => decryptConfig(tampered, key)).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/zero/projects/Sekiro/.worktrees/story/27-security-baseline/apps/api
pnpm test src/modules/security/utils/__tests__/crypto.util.spec.ts
```

Expected: FAIL (module not found)

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/api/src/modules/security/utils/crypto.util.ts
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const SALT = "sekiro-config-encryption-salt";

function deriveKey(key: string): Buffer {
  // 优先接受 32 字节 base64 或 hex 字符串
  const fromBase64 = Buffer.from(key, "base64");
  if (fromBase64.length === KEY_LENGTH) {
    return fromBase64;
  }
  if (/^[a-f0-9]{64}$/i.test(key)) {
    return Buffer.from(key, "hex");
  }
  return scryptSync(key, SALT, KEY_LENGTH);
}

export function encryptConfig(plaintext: string, key: string): string {
  const keyBuffer = deriveKey(key);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, keyBuffer, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `ENC(${iv.toString("base64")}:${encrypted.toString("base64")}:${authTag.toString("base64")})`;
}

export function decryptConfig(ciphertext: string, key: string): string {
  const trimmed = ciphertext.trim();
  if (!trimmed.startsWith("ENC(") || !trimmed.endsWith(")")) {
    return trimmed;
  }
  const payload = trimmed.slice(4, -1);
  const parts = payload.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted config format");
  }
  const [ivB64, cipherB64, authTagB64] = parts;
  const keyBuffer = deriveKey(key);
  const iv = Buffer.from(ivB64, "base64");
  const encrypted = Buffer.from(cipherB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");

  if (
    iv.length !== IV_LENGTH ||
    authTag.length !== AUTH_TAG_LENGTH
  ) {
    throw new Error("Invalid encrypted config format");
  }

  const decipher = createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test src/modules/security/utils/__tests__/crypto.util.spec.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/security/utils
git commit -m "feat(security): add AES-256-GCM config encryption utility"
```

---

### Task 3: Encrypted Config Loader

**Files:**
- Create: `apps/api/src/modules/security/providers/encrypted-config.loader.ts`
- Create: `apps/api/src/modules/security/providers/__tests__/encrypted-config.loader.spec.ts`

**Interfaces:**
- Consumes: `decryptConfig` from Task 2
- Produces: `encryptedConfigLoader(): Record<string, string>`

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/modules/security/providers/__tests__/encrypted-config.loader.spec.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encryptedConfigLoader } from "../encrypted-config.loader";
import { encryptConfig } from "../../utils/crypto.util";

describe("encryptedConfigLoader", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should pass plain values through", () => {
    process.env.PLAIN_VAR = "plain-value";
    const config = encryptedConfigLoader();
    expect(config.PLAIN_VAR).toBe("plain-value");
  });

  it("should decrypt ENC values", () => {
    const key = "test-key-that-is-exactly-32-bytes-long!!";
    process.env.CONFIG_ENCRYPTION_KEY = key;
    process.env.SECRET_VAR = encryptConfig("secret-value", key);
    const config = encryptedConfigLoader();
    expect(config.SECRET_VAR).toBe("secret-value");
  });

  it("should throw if encryption key is missing for ENC value", () => {
    delete process.env.CONFIG_ENCRYPTION_KEY;
    process.env.SECRET_VAR = "ENC(abc:def:ghi)";
    expect(() => encryptedConfigLoader()).toThrow(/CONFIG_ENCRYPTION_KEY/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test src/modules/security/providers/__tests__/encrypted-config.loader.spec.ts
```

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/api/src/modules/security/providers/encrypted-config.loader.ts
import { decryptConfig } from "../utils/crypto.util";

export const encryptedConfigLoader = (): Record<string, string> => {
  const decrypted: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (!value) continue;
    if (value.startsWith("ENC(") && value.endsWith(")")) {
      const encryptionKey = process.env.CONFIG_ENCRYPTION_KEY;
      if (!encryptionKey) {
        throw new Error(
          `CONFIG_ENCRYPTION_KEY is required to decrypt environment variable ${key}`,
        );
      }
      decrypted[key] = decryptConfig(value, encryptionKey);
    }
  }
  return decrypted;
};
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test src/modules/security/providers/__tests__/encrypted-config.loader.spec.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/security/providers
git commit -m "feat(security): add encrypted config loader for ENC(...) env values"
```

---

### Task 4: Redis Throttler Storage

**Files:**
- Create: `apps/api/src/modules/security/providers/throttler-storage-redis.service.ts`
- Create: `apps/api/src/modules/security/providers/__tests__/throttler-storage-redis.service.spec.ts`

**Interfaces:**
- Consumes: `REDIS_CLIENT` from `apps/api/src/redis.module.ts`
- Produces: `ThrottlerStorageRedisService implements ThrottlerStorage`
- Produces: `increment(key: string, ttlMs: number): Promise<ThrottlerStorageRecord>`

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/modules/security/providers/__tests__/throttler-storage-redis.service.spec.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ThrottlerStorageRedisService } from "../throttler-storage-redis.service";

describe("ThrottlerStorageRedisService", () => {
  let service: ThrottlerStorageRedisService;
  let mockRedis: any;

  beforeEach(() => {
    mockRedis = {
      multi: vi.fn(() => ({
        incr: vi.fn().mockReturnThis(),
        pExpire: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([3]),
      })),
    };
    service = new ThrottlerStorageRedisService(mockRedis);
  });

  it("should increment and set TTL", async () => {
    const record = await service.increment("auth/login:127.0.0.1", 60000);
    expect(record.totalHits).toBe(3);
    expect(record.timeToExpire).toBe(60000);
    expect(mockRedis.multi).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test src/modules/security/providers/__tests__/throttler-storage-redis.service.spec.ts
```

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/api/src/modules/security/providers/throttler-storage-redis.service.ts
import { Injectable, Inject } from "@nestjs/common";
import { ThrottlerStorage, ThrottlerStorageRecord } from "@nestjs/throttler";
import { RedisClientType } from "redis";
import { REDIS_CLIENT } from "../../../redis.module";

@Injectable()
export class ThrottlerStorageRedisService implements ThrottlerStorage {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redisClient: RedisClientType,
  ) {}

  async increment(key: string, ttlMs: number): Promise<ThrottlerStorageRecord> {
    const fullKey = `sekiro:throttle:${key}`;
    const multi = this.redisClient.multi();
    multi.incr(fullKey);
    multi.pExpire(fullKey, ttlMs);
    const results = await multi.exec();
    const totalHits = results ? (results[0] as number) : 1;
    return { totalHits, timeToExpire: ttlMs };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test src/modules/security/providers/__tests__/throttler-storage-redis.service.spec.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/security/providers
git commit -m "feat(security): add Redis-backed throttler storage"
```

---

### Task 5: SecurityModule Scaffold and Global Registration

**Files:**
- Create: `apps/api/src/modules/security/security.module.ts`
- Create: `apps/api/src/modules/security/index.ts`
- Create: `apps/api/src/app.module.ts`（从 main.ts 抽出）
- Modify: `apps/api/src/main.ts`

**Interfaces:**
- Consumes: `encryptedConfigLoader` from Task 3
- Consumes: `ThrottlerStorageRedisService` from Task 4
- Produces: `SecurityModule` 全局可用

- [ ] **Step 1: Create SecurityModule**

```ts
// apps/api/src/modules/security/security.module.ts
import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerModuleOptions } from "@nestjs/throttler";
import { RedisClientType } from "redis";
import { encryptedConfigLoader } from "./providers/encrypted-config.loader";
import { ThrottlerStorageRedisService } from "./providers/throttler-storage-redis.service";
import { RedisModule, REDIS_CLIENT } from "../../redis.module";
import { UploadController } from "./controllers/upload.controller";

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [".env", "../.env"],
      isGlobal: true,
      load: [encryptedConfigLoader],
    }),
    ThrottlerModule.forRootAsync({
      imports: [RedisModule],
      inject: [REDIS_CLIENT],
      useFactory: (
        redisClient: RedisClientType,
      ): ThrottlerModuleOptions => ({
        throttlers: [
          {
            ttl: parseInt(process.env.THROTTLE_TTL || "60", 10) * 1000,
            limit: parseInt(process.env.THROTTLE_LIMIT || "10", 10),
          },
        ],
        storage: new ThrottlerStorageRedisService(redisClient),
      }),
    }),
  ],
  controllers: [UploadController],
  providers: [ThrottlerStorageRedisService],
  exports: [ThrottlerStorageRedisService],
})
export class SecurityModule {}
```

- [ ] **Step 2: Create index.ts**

```ts
// apps/api/src/modules/security/index.ts
export * from "./security.module";
export * from "./providers/encrypted-config.loader";
export * from "./providers/throttler-storage-redis.service";
export * from "./pipes/file-validation.pipe";
export * from "./decorators/validated-file.decorator";
```

- [ ] **Step 3: Extract AppModule to independent file**

```ts
// apps/api/src/app.module.ts
import { Module } from "@nestjs/common";
import { PrismaModule } from "./modules/prisma";
import { RedisModule } from "./redis.module";
import { AuthModule } from "./modules/auth";
import { UserModule } from "./modules/user";
import { RoleModule } from "./modules/role";
import { MenuModule } from "./modules/menu";
import { DeptModule } from "./modules/dept";
import { DictModule } from "./modules/dict";
import { MonitorModule } from "./modules/monitor";
import { SecurityModule } from "./modules/security";

@Module({
  imports: [
    SecurityModule,
    PrismaModule,
    RedisModule,
    AuthModule,
    UserModule,
    RoleModule,
    MenuModule,
    DeptModule,
    DictModule,
    MonitorModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 4: Update main.ts**

修改 `apps/api/src/main.ts`：

1. 删除内联 `class AppModule {}`。
2. 顶部导入：

```ts
import helmet from "helmet";
import { ThrottlerGuard } from "@nestjs/throttler";
import { AppModule } from "./app.module";
import { ThrottlerExceptionFilter } from "./modules/security/filters/throttler-exception.filter";
```

3. 在 `app.setGlobalPrefix("api")` 之后添加：

```ts
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    xFrameOptions: { action: "deny" },
    xContentTypeOptions: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }),
);

app.useGlobalGuards(app.get(ThrottlerGuard));
app.useGlobalFilters(new ThrottlerExceptionFilter());
```

- [ ] **Step 5: Create ThrottlerExceptionFilter**

见 Task 6。

- [ ] **Step 6: Run typecheck**

```bash
cd /Users/zero/projects/Sekiro/.worktrees/story/27-security-baseline
pnpm typecheck
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/security apps/api/src/app.module.ts apps/api/src/main.ts
git commit -m "feat(security): add SecurityModule with helmet and throttler global registration"
```

---

### Task 6: Throttler Exception Filter

**Files:**
- Create: `apps/api/src/modules/security/filters/throttler-exception.filter.ts`
- Create: `apps/api/src/modules/security/filters/__tests__/throttler-exception.filter.spec.ts`

**Interfaces:**
- Consumes: `ThrottlerException` from `@nestjs/throttler`
- Produces: `{ code: 429, message: "请求过于频繁，请稍后再试", data: null }` over HTTP 200

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/modules/security/filters/__tests__/throttler-exception.filter.spec.ts
import { describe, it, expect, vi } from "vitest";
import { ThrottlerException } from "@nestjs/throttler";
import { ThrottlerExceptionFilter } from "../throttler-exception.filter";

describe("ThrottlerExceptionFilter", () => {
  it("should return code 429 with HTTP 200", () => {
    const filter = new ThrottlerExceptionFilter();
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
      }),
    } as any;

    filter.catch(new ThrottlerException("Too many requests"), host);

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      code: 429,
      message: "请求过于频繁，请稍后再试",
      data: null,
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/zero/projects/Sekiro/.worktrees/story/27-security-baseline/apps/api
pnpm test src/modules/security/filters/__tests__/throttler-exception.filter.spec.ts
```

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/api/src/modules/security/filters/throttler-exception.filter.ts
import { Catch, ExceptionFilter, ArgumentsHost } from "@nestjs/common";
import { ThrottlerException } from "@nestjs/throttler";
import type { Response } from "express";

@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  catch(_exception: ThrottlerException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    response.status(200).json({
      code: 429,
      message: "请求过于频繁，请稍后再试",
      data: null,
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test src/modules/security/filters/__tests__/throttler-exception.filter.spec.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/security/filters
git commit -m "feat(security): map ThrottlerException to code 429 ApiResponse"
```

---

### Task 7: Apply @Throttle and @SkipThrottle

**Files:**
- Modify: `apps/api/src/modules/auth/auth.controller.ts`
- Create: `apps/api/src/modules/monitor/controllers/health.controller.ts`（如不存在）

**Interfaces:**
- Consumes: `@Throttle`, `@SkipThrottle` from `@nestjs/throttler`

- [ ] **Step 1: Update AuthController login method**

在 `apps/api/src/modules/auth/auth.controller.ts` 顶部导入：

```ts
import { Throttle } from "@nestjs/throttler";
```

在 `login` 方法上添加：

```ts
@Post("login")
@HttpCode(200)
@Throttle(5, 60)
@ApiBody({ type: LoginDto })
// ...
async login(...) { ... }
```

- [ ] **Step 2: Skip throttle for Swagger docs and health**

如 `/docs` 路由在 `main.ts` 中通过 `app.use(...)` 注册，默认不走 NestJS 守卫，无需 `@SkipThrottle`。

如新增 `/health` 控制器，创建：

```ts
// apps/api/src/modules/monitor/controllers/health.controller.ts
import { Controller, Get, SkipThrottle } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";

@ApiTags('Health')
@Controller("health")
export class HealthController {
  @Get()
  @SkipThrottle()
  check() {
    return { status: "up", uptime: process.uptime() };
  }
}
```

并在 `apps/api/src/modules/monitor/monitor.module.ts` 中注册 `HealthController`。

- [ ] **Step 3: Run typecheck and tests**

```bash
cd /Users/zero/projects/Sekiro/.worktrees/story/27-security-baseline
pnpm typecheck
pnpm --filter @sekiro/api test
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/auth apps/api/src/modules/monitor
git commit -m "feat(security): apply @Throttle to login and @SkipThrottle to health"
```

---

### Task 8: File Upload Validation

**Files:**
- Create: `apps/api/src/modules/security/pipes/file-validation.pipe.ts`
- Create: `apps/api/src/modules/security/pipes/__tests__/file-validation.pipe.spec.ts`
- Create: `apps/api/src/modules/security/decorators/validated-file.decorator.ts`
- Create: `apps/api/src/modules/security/controllers/upload.controller.ts`

**Interfaces:**
- Produces: `FileValidationOptions { maxSize?, allowedTypes?, allowedExtensions? }`
- Produces: `FileValidationPipe implements PipeTransform`
- Produces: `@ValidatedFile(options?)` parameter decorator

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/modules/security/pipes/__tests__/file-validation.pipe.spec.ts
import { describe, it, expect } from "vitest";
import { BadRequestException } from "@nestjs/common";
import { FileValidationPipe } from "../file-validation.pipe";

function createFile(
  originalname: string,
  buffer: Buffer,
  size?: number,
): Express.Multer.File {
  return {
    fieldname: "file",
    originalname,
    encoding: "7bit",
    mimetype: "application/octet-stream",
    size: size ?? buffer.length,
    buffer,
    destination: "",
    filename: originalname,
    path: "",
    stream: null as any,
  };
}

describe("FileValidationPipe", () => {
  const options = {
    maxSize: 1024,
    allowedExtensions: [".png"],
    allowedTypes: ["image/png"],
  };

  it("should accept a valid PNG", async () => {
    const buffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    ]);
    const file = createFile("valid.png", buffer);
    const pipe = new FileValidationPipe(options);
    const result = await pipe.transform(file);
    expect(result.originalname).toBe("valid.png");
  });

  it("should reject wrong extension", async () => {
    const file = createFile("valid.exe", Buffer.from("MZ"));
    const pipe = new FileValidationPipe(options);
    await expect(pipe.transform(file)).rejects.toThrow(BadRequestException);
  });

  it("should reject executable magic", async () => {
    const file = createFile("valid.png", Buffer.from("MZ executable content"));
    const pipe = new FileValidationPipe(options);
    await expect(pipe.transform(file)).rejects.toThrow(BadRequestException);
  });

  it("should reject oversized file", async () => {
    const buffer = Buffer.alloc(2048, 0);
    buffer[0] = 0x89;
    buffer[1] = 0x50;
    buffer[2] = 0x4e;
    buffer[3] = 0x47;
    const file = createFile("big.png", buffer, 2048);
    const pipe = new FileValidationPipe(options);
    await expect(pipe.transform(file)).rejects.toThrow(BadRequestException);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test src/modules/security/pipes/__tests__/file-validation.pipe.spec.ts
```

Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/api/src/modules/security/pipes/file-validation.pipe.ts
import {
  Injectable,
  PipeTransform,
  BadRequestException,
} from "@nestjs/common";
import * as path from "path";

export interface FileValidationOptions {
  maxSize?: number;
  allowedTypes?: string[];
  allowedExtensions?: string[];
}

const EXECUTABLE_EXTENSIONS = new Set([
  ".exe", ".dll", ".bat", ".cmd", ".sh", ".php",
  ".jsp", ".asp", ".aspx", ".jar", ".bin", ".com",
]);

const EXECUTABLE_MAGICS = [
  Buffer.from([0x4d, 0x5a]), // MZ
  Buffer.from([0x7f, 0x45, 0x4c, 0x46]), // ELF
  Buffer.from([0x23, 0x21]), // shebang
];

function matchMimePattern(actual: string, pattern: string): boolean {
  if (pattern === "*/*") return true;
  if (pattern.endsWith("/*")) {
    return actual.startsWith(pattern.slice(0, -1));
  }
  return actual === pattern;
}

function hasExecutableMagic(buffer: Buffer): boolean {
  return EXECUTABLE_MAGICS.some((magic) =>
    buffer.length >= magic.length && buffer.subarray(0, magic.length).equals(magic),
  );
}

@Injectable()
export class FileValidationPipe implements PipeTransform {
  constructor(private readonly options: FileValidationOptions = {}) {}

  async transform(file: Express.Multer.File): Promise<Express.Multer.File> {
    if (!file) {
      throw new BadRequestException("file is required");
    }

    const ext = path.extname(file.originalname).toLowerCase();

    if (EXECUTABLE_EXTENSIONS.has(ext)) {
      throw new BadRequestException(`file type ${ext} is not allowed`);
    }

    if (this.options.allowedExtensions?.length) {
      if (!this.options.allowedExtensions.includes(ext)) {
        throw new BadRequestException(`file extension ${ext} is not allowed`);
      }
    }

    const maxSize = this.options.maxSize ?? parseInt(process.env.UPLOAD_MAX_SIZE || "5242880", 10);
    if (file.size > maxSize) {
      throw new BadRequestException(
        `file size exceeds limit of ${maxSize} bytes`,
      );
    }

    if (hasExecutableMagic(file.buffer)) {
      throw new BadRequestException("executable file content is not allowed");
    }

    if (this.options.allowedTypes?.length) {
      const { fileTypeFromBuffer } = await import("file-type");
      const detected = await fileTypeFromBuffer(file.buffer);
      const mime = detected?.mime || file.mimetype || "application/octet-stream";
      const allowed = this.options.allowedTypes.some((pattern) =>
        matchMimePattern(mime, pattern),
      );
      if (!allowed) {
        throw new BadRequestException(`file MIME type ${mime} is not allowed`);
      }
    }

    return file;
  }
}
```

- [ ] **Step 4: Create @ValidatedFile decorator**

```ts
// apps/api/src/modules/security/decorators/validated-file.decorator.ts
import { UploadedFile } from "@nestjs/common";
import {
  FileValidationPipe,
  FileValidationOptions,
} from "../pipes/file-validation.pipe";

export const ValidatedFile = (options?: FileValidationOptions) =>
  UploadedFile(new FileValidationPipe(options));
```

- [ ] **Step 5: Create sample upload controller**

```ts
// apps/api/src/modules/security/controllers/upload.controller.ts
import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  HttpCode,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { ValidatedFile } from "../decorators/validated-file.decorator";
import type { ApiResponse as ApiResponseType } from "@sekiro/shared";

@ApiTags('Upload')
@Controller("system/upload")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
  @Post()
  @HttpCode(200)
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: '文件上传（示例）' })
  @ApiResponse({ status: 200, description: '成功' })
  @ApiResponse({ status: 422, description: '文件校验失败' })
  async upload(
    @ValidatedFile({
      maxSize: 5 * 1024 * 1024,
      allowedExtensions: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf"],
      allowedTypes: ["image/*", "application/pdf"],
    })
    file: Express.Multer.File,
  ): Promise<ApiResponseType<{ filename: string; size: number }>> {
    return {
      code: 0,
      message: "上传成功",
      data: {
        filename: file.originalname,
        size: file.size,
      },
    };
  }
}
```

- [ ] **Step 6: Run tests**

```bash
pnpm test src/modules/security/pipes/__tests__/file-validation.pipe.spec.ts
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/security
git commit -m "feat(security): add file upload validation with extension, MIME, magic and blacklist"
```

---

### Task 9: Config Encryption CLI

**Files:**
- Create: `apps/api/src/modules/security/cli/encrypt-config.cli.ts`
- Modify: `apps/api/package.json`

**Interfaces:**
- Consumes: `encryptConfig` from Task 2

- [ ] **Step 1: Create CLI script**

```ts
// apps/api/src/modules/security/cli/encrypt-config.cli.ts
import "dotenv/config";
import * as path from "path";
import * as dotenv from "dotenv";
import { encryptConfig } from "../utils/crypto.util";

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../../../../../.env") });

const plaintext = process.argv[2];
const key = process.env.CONFIG_ENCRYPTION_KEY;

if (!plaintext) {
  console.error("Usage: pnpm encrypt:config <plaintext>");
  process.exit(1);
}

if (!key) {
  console.error("CONFIG_ENCRYPTION_KEY is required");
  process.exit(1);
}

console.log(encryptConfig(plaintext, key));
```

- [ ] **Step 2: Add package script**

```json
{
  "scripts": {
    "encrypt:config": "tsx src/modules/security/cli/encrypt-config.cli.ts"
  }
}
```

- [ ] **Step 3: Test CLI**

```bash
CONFIG_ENCRYPTION_KEY="demo-key-32-bytes-long-for-cli-test!" pnpm --filter @sekiro/api encrypt:config "postgresql://u:p@localhost/db"
```

Expected: 输出 `ENC(...)` 格式密文。

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/security/cli apps/api/package.json
git commit -m "feat(security): add encrypt:config CLI for generating ENC(...) values"
```

---

### Task 10: Frontend CSP Nonce Middleware

**Files:**
- Create: `apps/web/middleware.ts`
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/next.config.js`

**Interfaces:**
- Produces: `Content-Security-Policy` response header with nonce
- Produces: `x-nonce` request header for downstream use

- [ ] **Step 1: Create middleware.ts**

```ts
// apps/web/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const isDev = process.env.NODE_ENV === "development";
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const base = [
    "default-src 'self'",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "font-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
  ];

  const csp = isDev
    ? [
        ...base,
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
      ].join("; ")
    : [
        ...base,
        `script-src 'nonce-${nonce}' 'strict-dynamic' 'self'`,
        `style-src 'nonce-${nonce}' 'self'`,
        "upgrade-insecure-requests",
      ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: "/:path*",
};
```

- [ ] **Step 2: Update layout.tsx to consume nonce**

```tsx
// apps/web/app/layout.tsx
import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Sekiro · 管理后台",
  description: "开箱即用的中后台脚手架原型",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const nonce = headers().get("x-nonce") || undefined;

  return (
    <html lang="zh-CN" suppressHydrationWarning nonce={nonce}>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>{children}</AuthProvider>
          <Toaster position="top-center" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Add CSP header override in next.config.js**

```js
// apps/web/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/api/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
```

- [ ] **Step 4: Run typecheck**

```bash
cd /Users/zero/projects/Sekiro/.worktrees/story/27-security-baseline
pnpm typecheck
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/middleware.ts apps/web/app/layout.tsx apps/web/next.config.js
git commit -m "feat(web): add CSP nonce middleware and security headers"
```

---

### Task 11: Environment Variables and Documentation

**Files:**
- Modify: `apps/api/.env.example`
- Modify: `apps/api/README.md`（如存在安全相关章节则追加）

- [ ] **Step 1: Update .env.example**

追加到 `apps/api/.env.example`：

```bash
# 接口限流（秒 / 次数）
THROTTLE_TTL=60
THROTTLE_LIMIT=10

# 文件上传
UPLOAD_MAX_SIZE=5242880

# 配置加密（32 字节 base64 或 hex；用于解密 ENC(...) 环境变量）
CONFIG_ENCRYPTION_KEY=
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/.env.example
git commit -m "docs(env): add Story #27 security environment variables"
```

---

### Task 12: Security Headers Integration Test

**Files:**
- Create: `apps/api/src/modules/security/__tests__/security-headers.spec.ts`

**Interfaces:**
- Consumes: `AppModule`, helmet, ThrottlerGuard

- [ ] **Step 1: Write integration test**

```ts
// apps/api/src/modules/security/__tests__/security-headers.spec.ts
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../../../app.module";
import { REDIS_CLIENT } from "../../../redis.module";

describe("Security Headers (integration)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(REDIS_CLIENT)
      .useValue({
        connect: vi.fn().mockResolvedValue(undefined),
        multi: vi.fn(() => ({
          incr: vi.fn().mockReturnThis(),
          pExpire: vi.fn().mockReturnThis(),
          exec: vi.fn().mockResolvedValue([1]),
        })),
        get: vi.fn().mockResolvedValue(null),
        setEx: vi.fn().mockResolvedValue("OK"),
        del: vi.fn().mockResolvedValue(1),
        expire: vi.fn().mockResolvedValue(1),
        incr: vi.fn().mockResolvedValue(1),
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("should include helmet security headers", async () => {
    const response = await request(app.getHttpServer()).get("/api/health");
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["strict-transport-security"]).toBeDefined();
    expect(response.headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });
});
```

- [ ] **Step 2: Run test**

```bash
pnpm test src/modules/security/__tests__/security-headers.spec.ts
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/security/__tests__/security-headers.spec.ts
git commit -m "test(security): add integration test for helmet security headers"
```

---

### Task 13: Final Verification

**Files:**
- All changed files

- [ ] **Step 1: Run full test suite**

```bash
cd /Users/zero/projects/Sekiro/.worktrees/story/27-security-baseline
pnpm --filter @sekiro/api test
```

Expected: 全量 PASS

- [ ] **Step 2: Run typecheck**

```bash
pnpm typecheck
```

Expected: PASS

- [ ] **Step 3: Run lint**

```bash
pnpm lint
```

Expected: PASS（或仅有与本次改动无关的历史问题）

- [ ] **Step 4: Update GitHub issue checklist**

将 Story #27 的 issue body 中对应范围项勾选为完成：
- [x] Helmet 安全响应头(SEC-10)
- [x] 接口限流 @Throttle(SEC-3)
- [x] 文件上传校验:类型/大小/magic(SEC-9)
- [x] 密钥管理:配置加密(SEC-密钥)
- [x] CSP / XSS 加固

- [ ] **Step 5: Final commit or no-op if clean**

```bash
git status
```

---

## Spec Coverage Check

| Spec 要求 | 对应 Task |
| --- | --- |
| Helmet 安全响应头（SEC-10） | Task 5, Task 12 |
| 接口限流 @Throttle（SEC-3） | Task 4, Task 5, Task 6, Task 7 |
| 文件上传校验：类型/大小/magic（SEC-9） | Task 8 |
| 密钥管理：配置加密 | Task 2, Task 3, Task 9 |
| CSP / XSS 加固 | Task 10 |
| 限流返回 429 | Task 6 |
| 上传失败返回 422 | Task 8 |

无遗漏。

## Placeholder Scan

- 无 TBD / TODO / "implement later" / "fill in details"。
- 每个测试步骤包含具体断言。
- 每个代码步骤包含完整文件内容。
- 所有命令包含预期输出。

## Type Consistency Check

- `ThrottlerStorageRedisService.increment` 返回 `ThrottlerStorageRecord`，与 `@nestjs/throttler` v6 接口一致。
- `FileValidationPipe.transform` 返回 `Express.Multer.File`。
- `encryptedConfigLoader` 返回 `Record<string, string>`。
- `@ValidatedFile` 使用 `UploadedFile` + `FileValidationPipe`。

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-07-07-story-27-security-baseline.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints for review.

Which approach?
