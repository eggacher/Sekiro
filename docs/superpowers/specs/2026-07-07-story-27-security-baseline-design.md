# Story #27 安全基线设计文档

> **Story**: [#27 Story: 安全基线(限流/安全头/上传校验)](https://github.com/eggacher/Sekiro/issues/27)
> **Epic**: #3 v0.5 生产就绪
> **日期**: 2026-07-07
> **状态**: 待实现（设计已确认）
> **依赖**: v0.1 MVP 已完成（RBAC、用户/角色/菜单、Redis 会话、操作日志等）

---

## 1. 目标

补齐 Sekiro 后端与前端的安全基线，使 v0.5 达到"接近生产可用"的安全水准。

## 2. 范围

本次 Story 实现以下 5 项能力：

1. **Helmet 安全响应头**（SEC-10）
2. **接口限流 `@Throttle`**（SEC-3）
3. **文件上传校验**：扩展名 + MIME + magic number + 可执行文件黑名单（SEC-9）
4. **密钥管理：配置加密**（自定义 SEC-密钥）
5. **CSP / XSS 加固**：后端 API 严格 CSP，前端 Next.js nonce CSP（生产环境禁用 `unsafe-inline`）

## 3. 设计决策

| 决策点 | 选择 | 理由 |
| --- | --- | --- |
| 限流框架 | `@nestjs/throttler` + Redis 存储 | 与 NestJS 生态一致，Story 明确要求 `@Throttle` |
| 安全头框架 | `helmet` | Node.js 安全头事实标准 |
| 文件 magic 解析 | `file-type` | 轻量、维护活跃 |
| 配置加密算法 | AES-256-GCM | 内置完整性校验，无需额外 HMAC |
| 前端 CSP nonce | Next.js `middleware.ts` 生成 | App Router 推荐做法，后端 API 无 HTML 渲染需求，各自严格 |
| 测试策略 | 本地断言关键头 | 稳定、不依赖外部网络 |

## 4. 架构设计

### 4.1 新增模块

在 `apps/api/src/modules/security/` 下新增 `SecurityModule`：

```
security/
├── security.module.ts
├── providers/
│   ├── throttler-storage-redis.service.ts   # Redis 限流存储
│   └── encrypted-config.loader.ts           # 配置加密加载器
├── pipes/
│   └── file-validation.pipe.ts              # 文件上传校验
├── interceptors/
│   └── file-upload.interceptor.ts           # 可选的统一上传拦截
├── decorators/
│   └── validated-file.decorator.ts          # @ValidatedFile
├── utils/
│   └── crypto.util.ts                       # AES-256-GCM 加密/解密
├── cli/
│   └── encrypt-config.cli.ts                # 生成 ENC(...) 密文
└── __tests__/
    ├── security.module.spec.ts
    ├── throttler-storage-redis.service.spec.ts
    ├── file-validation.pipe.spec.ts
    └── encrypted-config.loader.spec.ts
```

### 4.2 全局注册

`apps/api/src/main.ts`：

```ts
import helmet from "helmet";
import { ThrottlerGuard } from "@nestjs/throttler";
import { SecurityModule } from "./modules/security";

// Helmet 安全头
app.use(helmet({
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
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  xFrameOptions: { action: "deny" },
  xContentTypeOptions: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));

// 限流守卫
app.useGlobalGuards(app.get(ThrottlerGuard));
```

`AppModule` 导入 `SecurityModule` 和 `ConfigModule`。

## 5. 各能力详细设计

### 5.1 接口限流

**环境变量**：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `THROTTLE_TTL` | `60` | 窗口秒数 |
| `THROTTLE_LIMIT` | `10` | 窗口内最大请求数 |

**默认策略**：
- 全局 10 次 / 60 秒
- 登录接口 `POST /auth/login`：`@Throttle({ default: { limit: 5, ttl: 60 * 1000 } })`
- 健康检查 `/health`：`@SkipThrottle()`
- Swagger docs `/docs`：`@SkipThrottle()`（仅非生产环境）

**Redis 存储实现**：
- 实现 `ThrottlerStorage` 接口
- key 格式：`throttle:<route>:<ip_or_userId>`
- 使用现有 Redis 客户端，TTL 与限流窗口对齐

### 5.2 文件上传校验

**装饰器**：

```ts
@ValidatedFile({
  maxSize: 5 * 1024 * 1024,       // 默认 5MB
  allowedTypes: ["image/*", "application/pdf"], // MIME 通配符
  allowedExtensions: [".jpg", ".png", ".pdf"],
})
```

**校验顺序**：
1. 文件是否存在
2. 扩展名白名单
3. 文件大小
4. magic number 读取真实 MIME
5. 真实 MIME 与声明扩展名 / MIME 通配符匹配
6. 可执行文件黑名单（ELF、MZ、bat、cmd、sh、php、jsp、asp、aspx 等魔数或扩展名）

**失败响应**：
- `code=422`，`data=[{ field: "file", message: "..." }]`

### 5.3 配置加密

**密文格式**：

```text
ENC(<base64(iv)>:<base64(ciphertext)>:<base64(authTag)>)
```

**加载流程**：
1. `ConfigModule.forRoot({ load: [encryptedConfigLoader] })`
2. loader 读取 `.env` 后递归遍历值
3. 命中 `ENC(...)` 则调用 `crypto.util.decrypt`
4. 解密失败：启动时报错退出

**CLI 工具**：

```bash
# 生成密文
pnpm --filter @sekiro/api encrypt:config "postgresql://..."
# 输出：ENC(xxx:yyy:zzz)
```

**默认加密字段建议**：
- `DATABASE_URL`、`DIRECT_DATABASE_URL`
- `JWT_SECRET`
- `REDIS_PASSWORD`（如使用密码）

### 5.4 CSP / XSS 加固

**后端 API**（`helmet` 严格策略）：

```text
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'; upgrade-insecure-requests
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Referrer-Policy: strict-origin-when-cross-origin
```

**前端 Next.js**（`apps/web/middleware.ts`）：

- 生成随机 nonce（每次请求 128-bit base64）
- 注入响应头：
  ```text
  Content-Security-Policy: script-src 'nonce-<nonce>' 'strict-dynamic' 'self'; style-src 'nonce-<nonce>' 'self'; ...
  ```
- 在 `app/layout.tsx` 通过 `headers()` 读取 nonce，传给 script/style 标签
- 开发环境保留 `'unsafe-inline'` 以兼容 React Fast Refresh

## 6. 环境变量变更

`.env.example` 新增：

```bash
# 限流
THROTTLE_TTL=60
THROTTLE_LIMIT=10

# 文件上传
UPLOAD_MAX_SIZE=5242880
UPLOAD_ALLOWED_TYPES=image/*,application/pdf

# 配置加密
CONFIG_ENCRYPTION_KEY=                         # 32-byte base64 或 hex，生产环境必须设置
```

## 7. 接口契约变化

- 限流触发：HTTP 200（项目约定），`code=429`，`message="请求过于频繁，请稍后再试"`
- 上传校验失败：`code=422`，字段级错误
- 其他接口无变化

## 8. 测试策略

| 测试文件 | 覆盖点 |
| --- | --- |
| `security.module.spec.ts` | 模块初始化、Helmet 中间件注册、ThrottlerGuard 全局注册 |
| `throttler-storage-redis.service.spec.ts` | increment / get / expire 行为、key 格式 |
| `file-validation.pipe.spec.ts` | 正常文件、扩展名错误、大小超限、magic 不匹配、可执行文件黑名单 |
| `encrypted-config.loader.spec.ts` | 明文透传、ENC 解密、错误密文、缺失密钥 |
| `security-headers.spec.ts`（集成） | 启动应用后断言关键安全头存在 |

## 9. 验收清单

- [ ] `securityheaders.com` 关键头检查通过（本地等价断言通过）
- [ ] 限流生效（超阈值返回 429）
- [ ] 文件上传三层校验生效
- [ ] 配置加密 CLI 可用，ENC 值在运行时可正确解密
- [ ] 所有新增测试通过
- [ ] `pnpm typecheck` 全 workspace 通过
- [ ] `pnpm lint` 全 workspace 通过

## 10. 风险与回退

| 风险 | 应对 |
| --- | --- |
| Helmet CSP 严格策略影响前端开发 | 开发环境放宽，仅生产启用严格 nonce 策略 |
| Redis 限流在单测中依赖 Redis | 单测使用内存 Redis 或 mock storage；集成测试才连真实 Redis |
| 配置加密密钥缺失导致启动失败 | 启动时明确报错，本地 `.env.example` 保留明文示例并标注 |
| nonce 方案与第三方脚本冲突 | 生产严格，开发宽松；文档说明如何放行外部脚本 |

## 11. 后续可扩展

- 集成 `clamd` / 云扫描服务做文件病毒扫描
- 限流按用户维度精细化
- 配置加密支持 KMS / Vault
- 增加 WAF 规则层（如 ModSecurity / Cloudflare）
