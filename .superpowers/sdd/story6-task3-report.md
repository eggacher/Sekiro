# Story #6 Task 3: JwtProvider（Token 签发和验证）- 完成报告

## 任务概述

实现 JWT 和 RefreshToken 的签发、验证逻辑，采用 TDD 方式：先写测试，再实现。

## 步骤完成清单

- ✅ **Step 1**: 创建失败测试
  - 创建 `apps/api/src/modules/auth/providers/__tests__/jwt.provider.spec.ts`
  - 6 个测试用例设计完成
  - 运行测试确认失败（找不到 JwtProvider）

- ✅ **Step 2**: 实现 JwtProvider
  - 创建 `apps/api/src/modules/auth/providers/jwt.provider.ts`
  - 实现 `signToken(payload)` - 2h 有效期
  - 实现 `verifyToken(token)` - 验证失败返回 null
  - 实现 `signRefreshToken(payload)` - 30d 有效期
  - 实现 `verifyRefreshToken(token)` - 验证失败返回 null

- ✅ **Step 3**: 运行测试确认通过
  - 所有 6 个测试通过
  - 添加 `vitest.config.ts` 配置全局 globals 和 node 环境

- ✅ **Step 4**: Commit
  - 提交 commit: `c69ea82`
  - Message: "feat: implement JwtProvider for token signing and verification (Task 3)"

## 测试结果

```
Test Files  1 passed (1)
Tests  6 passed (6)
Duration  568ms
```

### 测试覆盖范围

| 测试套件 | 测试用例 | 状态 | 验证内容 |
|---------|---------|------|---------|
| signToken | should sign a token with 2h expiry | ✅ PASS | token 存在，expiresIn=7200 |
| signRefreshToken | should sign a refresh token with 30d expiry | ✅ PASS | refreshToken 存在，expiresIn=2592000 |
| verifyToken | should verify a valid token | ✅ PASS | 返回 payload，sub=1 |
| verifyToken | should return null for invalid token | ✅ PASS | 异常时返回 null |
| verifyRefreshToken | should verify a valid refresh token | ✅ PASS | 返回 payload 存在 |
| verifyRefreshToken | should return null if refresh token type is invalid | ✅ PASS | type 不是 refresh 时返回 null |

## Commits

```
c69ea82 (HEAD -> main) feat: implement JwtProvider for token signing and verification (Task 3)
9dd3853 feat: add auth types and DTOs
ef2b108 chore: add @nestjs/jwt and redis dependencies
```

## 创建的文件

| 文件 | 行数 | 用途 |
|-----|-----|------|
| `apps/api/src/modules/auth/providers/jwt.provider.ts` | 50 | JwtProvider 实现 |
| `apps/api/src/modules/auth/providers/__tests__/jwt.provider.spec.ts` | 64 | 单元测试 |
| `apps/api/vitest.config.ts` | 6 | Vitest 配置 |

## 实现细节

### JwtProvider 类结构

```typescript
@Injectable()
export class JwtProvider {
  private readonly jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
  private readonly refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || 'refresh-secret-key';
  
  constructor(private readonly jwtService: JwtService) {}
  
  // 签发访问令牌，2h 有效期
  signToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): { token: string; expiresIn: number }
  
  // 验证访问令牌，失败返回 null
  verifyToken(token: string): TokenPayload | null
  
  // 签发刷新令牌，30d 有效期，自动添加 type='refresh'
  signRefreshToken(payload: Omit<RefreshTokenPayload, 'iat' | 'exp' | 'type'>): { refreshToken: string; expiresIn: number }
  
  // 验证刷新令牌，type 必须为 'refresh'，失败返回 null
  verifyRefreshToken(token: string): RefreshTokenPayload | null
}
```

### 关键设计决策

1. **密钥管理**: JWT 和 RefreshToken 使用不同的密钥，从环境变量读取，有默认值
2. **失败处理**: `verify*` 方法使用 try-catch，异常时返回 null 而不抛出异常
3. **Token 标记**: RefreshToken 自动添加 `type: 'refresh'` 标记，验证时检查该标记
4. **有效期**: 
   - JWT: `expiresIn: '2h'` → 7200 秒
   - RefreshToken: `expiresIn: '30d'` → 2592000 秒（30 × 86400）

## 自审发现

### ✅ 代码质量

- **类型安全**: 使用 TypeScript 强类型，Payload 类型通过 Omit 约束，防止 iat/exp 重复设置
- **单一职责**: JwtProvider 仅负责 JWT 签发/验证，与 NestJS 框架解耦
- **可测试性**: 通过构造函数注入 JwtService，易于 Mock 测试
- **错误处理**: 统一的 null 返回约定，调用者不需要 try-catch

### ✅ 边界条件覆盖

- ✅ 有效 token 验证
- ✅ 无效 token 异常处理
- ✅ RefreshToken type 校验
- ✅ token 与 refreshToken 分开密钥存储

### ✅ 契约完整性

- ✅ 消费接口：@nestjs/jwt JwtService 通过 constructor 注入
- ✅ 生产接口：4 个方法签名与计划完全匹配
- ✅ 类型消费：TokenPayload, RefreshTokenPayload 来自 Task 2 的 types.ts
- ✅ 依赖关系：Task 1 已安装 @nestjs/jwt，无新增依赖

### ⚠️ 潜在改进点（不阻塞本任务）

1. **环境变量校验**: 生产环境应使用 ConfigService 而非 process.env
2. **密钥长度检验**: 应在 constructor 中验证密钥长度（建议 >= 32 字节）
3. **Token 过期日志**: 验证失败可添加日志用于审计
4. **Algorithm 显式指定**: 应在 sign 选项中指定 algorithm (如 'HS256')

这些改进可在后续任务（如中间件集成）中统一处理，不影响当前 Task 完成度。

## 状态

**Status: DONE** ✅

所有步骤完成，所有测试通过，代码已 commit。Task 3 准备就绪，可进行 Task 4 (AuthService)。

## 下一步

- Task 4: AuthService（登录/登出/刷新令牌流程）
- 将 JwtProvider 注入到 AuthService
- 实现 login(), logout(), refreshToken() 业务逻辑
