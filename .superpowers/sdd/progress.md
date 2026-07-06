# Story #16: 前端基建（mock 切真实 API + 工程化）— 执行进度

## 计划信息
- **计划文件**：`docs/superpowers/plans/2026-07-05-frontend-infrastructure.md`
- **执行方式**：subagent-driven-development
- **开始时间**：2026-07-05
- **完成时间**：2026-07-05

## 任务清单

- [x] Task 1: Next.js API 代理配置
- [x] Task 2: 增强请求客户端（401/403/422）
- [x] Task 3: 新增 Auth Store
- [x] Task 4: 创建 AuthProvider 并挂载
- [x] Task 5: 登录页接真实 `/auth/login`
- [x] Task 6: Header 退出登录 + Sidebar 真实菜单驱动
- [x] Task 7: 岗位管理页面迁移
- [x] Task 8: 部门管理页面迁移
- [x] Task 9: 菜单管理页面迁移
- [x] Task 10: 用户管理页面迁移
- [x] Task 11: 工作台 Dashboard 与 codegen 处理
- [x] Task 12: 清理硬编码菜单与全局验证
- [x] Task 13: 更新本地 GitHub Issues 同步文档
- [x] Final: 全量代码 review

## 完成记录

### Task 1: Next.js API 代理配置
- **Commit**: `ff8aa4f`
- **审阅**: ✅ 代理配置完成；发现后端启动阻塞问题并修复
- **修复 Commit**: `db6fc6b`
- **修复内容**: DictModule/MonitorModule 补充 PrismaModule 导入；后端设置 `/api` 全局前缀；vitest 排除 dist 目录

### Task 2: 增强请求客户端（401/403/422）
- **Commit**: `6ccb2c6`
- **审阅**: ✅ typecheck 通过，改动符合 plan

### Task 3: 新增 Auth Store
### Task 4: 创建 AuthProvider 并挂载
### Task 5: 登录页接真实 `/auth/login`
- **Commit**: `7ee8084`
- **审阅**: ✅ typecheck + 后端测试通过；子代理额外实现了后端 `/auth/me` 接口
- **备注**: 存在 HTTP 401 状态码处理的小问题，后续可优化

### Task 6: Header 退出登录 + Sidebar 真实菜单驱动
- **Commit**: `9bfa5c3`
- **审阅**: ✅ typecheck 通过
- **备注**: 面包屑仍使用硬编码菜单，后续可优化

### Task 7: 岗位管理页面迁移
- **Commit**: `def3a8c`
- **审阅**: ✅ typecheck 通过

### Task 8: 部门管理页面迁移
- **Commit**: `bd4685b`
- **审阅**: ✅ typecheck 通过

### Task 9: 菜单管理页面迁移
- **Commit**: `9d1b65f`
- **审阅**: ✅ typecheck 通过，无 concerns

### Task 10: 用户管理页面迁移
- **Commit**: `4ea68f5`
- **审阅**: ✅ typecheck 通过

### Task 11: 工作台 Dashboard 与 codegen 处理
- **Commit**: `b46f857`
- **审阅**: ✅ typecheck 通过，无 concerns

### Task 12: 清理硬编码菜单与全局验证
- **Commit**: `c949c63`
- **审阅**: ✅ typecheck + lint + 101 API 测试全部通过

### Task 13: 更新本地 GitHub Issues 同步文档
- **Commit**: `4a0eaeb`
- **审阅**: ✅ 文档更新完成

### Final: 全量代码 review
- **验证结果**: ✅ `pnpm typecheck` + `pnpm lint` + `pnpm --filter @sekiro/api test` 全部通过
- **测试**: 101 / 101 通过

---

# Story #15: 个人中心（资料/改密/通知偏好）— 执行进度

## 计划信息
- **计划文件**：`docs/superpowers/plans/2026-07-05-personal-center.md`
- **执行方式**：subagent-driven-development
- **开始时间**：2026-07-05
- **完成时间**：2026-07-05

## 任务清单

- [x] Task 1: 后端修改密码 DTO 与服务方法
  - **Commit**: `c64a320`
  - **审阅**: ✅ typecheck + 101 测试通过

- [x] Task 2: 后端新增个人中心端点
  - **Commit**: `d18c950`
  - **审阅**: ✅ typecheck + 101 测试通过

- [x] Task 3: 前端个人中心页面绑定真实数据
  - **Commit**: `84abba6`
  - **审阅**: ✅ typecheck 通过

- [x] Task 4: 全量验证与文档更新
  - **Commit**: `docs(sync): update progress and issue status for Story #15`
  - **审阅**: ✅ typecheck + lint + 101 测试全部通过

- [x] Final: 全量代码 review
  - **验证结果**: ✅ `pnpm typecheck` + `pnpm lint` + `pnpm --filter @sekiro/api test` 全部通过
  - **测试**: 101 / 101 通过

## 完成记录

### Task 1: 后端修改密码 DTO 与服务方法
- **Commit**: `c64a320`
- **审阅**: ✅ typecheck + 101 测试通过

### Task 2: 后端新增个人中心端点
- **Commit**: `d18c950`
- **审阅**: ✅ typecheck + 101 测试通过

### Task 3: 前端个人中心页面绑定真实数据
- **Commit**: `84abba6`
- **审阅**: ✅ typecheck 通过

### Task 4: 全量验证与文档更新
- **Commit**: `docs(sync): update progress and issue status for Story #15`
- **审阅**: ✅ typecheck + lint + 101 测试全部通过

### Final: 全量代码 review
- **验证结果**: ✅ `pnpm typecheck` + `pnpm lint` + `pnpm --filter @sekiro/api test` 全部通过
- **测试**: 101 / 101 通过

---

# Story #19: 数据权限 DataScope 完整实现 — 执行进度

## 计划信息
- **规范文件**：`docs/superpowers/specs/2026-07-05-data-scope-design.md`
- **执行方式**：随角色 / 用户 / 部门模块增量实现
- **完成时间**：2026-07-06

## 任务清单

- [x] 后端 `DataScopeService` 计算用户数据权限范围
- [x] 后端 `DataScopeInterceptor` + `@UserScope()` 装饰器
- [x] 用户管理列表按数据权限裁剪 (`UserRepository.findPage`)
- [x] 部门管理树按数据权限裁剪 (`DeptRepository.findAll`)
- [x] 角色编辑支持设置数据范围与自定义部门 (`/system/role/:id/data-scope`)
- [x] 前端角色弹窗展示数据范围下拉与自定义部门树
- [x] 数据权限相关单元测试

## 完成记录

### 后端数据权限计算与挂载
- **相关文件**：
  - `apps/api/src/modules/auth/services/data-scope.service.ts`
  - `apps/api/src/modules/auth/interceptors/data-scope.interceptor.ts`
  - `apps/api/src/modules/auth/decorators/user-scope.decorator.ts`
  - `apps/api/src/modules/auth/types.ts`
- **审阅**: ✅ 支持 `all / dept_and_below / dept / self / custom` 五种范围；多角色取并集；无角色降级为 `self`

### 用户列表数据权限过滤
- **相关文件**：
  - `apps/api/src/modules/user/user.controller.ts`
  - `apps/api/src/modules/user/repositories/user.repository.ts`
- **审阅**: ✅ `GET /system/user` 已挂载 `DataScopeInterceptor`，按 `isAll / isSelf / deptIds` 过滤

### 部门树数据权限过滤
- **相关文件**：
  - `apps/api/src/modules/dept/dept.controller.ts`
  - `apps/api/src/modules/dept/repositories/dept.repository.ts`
- **审阅**: ✅ `GET /system/dept` 已挂载 `DataScopeInterceptor`，非超管按允许部门裁剪

### 角色数据范围持久化
- **相关文件**：
  - `apps/api/src/modules/role/role.controller.ts`
  - `apps/api/src/modules/role/services/role.service.ts`
  - `apps/api/src/modules/role/repositories/role.repository.ts`
  - `apps/web/app/(dashboard)/system/role/page.tsx`
- **审阅**: ✅ 前端支持五种范围选择与自定义部门树；后端 `/system/role/:id/data-scope` 原子更新 `role.dataScope` 与 `role_dept`

### 测试
- **相关文件**：
  - `apps/api/src/modules/auth/services/__tests__/data-scope.service.spec.ts`
  - `apps/api/src/modules/user/__tests__/user.data-scope.spec.ts`
  - `apps/api/src/modules/dept/__tests__/dept.data-scope.spec.ts`
- **审阅**: ✅ 全部通过

### Final: 全量代码 review
- **验证结果**: ✅ `pnpm typecheck` + `pnpm lint` + `pnpm --filter @sekiro/api test` 全部通过
- **测试**: 101 / 101 通过

---

# Story #24: API 文档（OpenAPI + Scalar）— 执行进度

## 计划信息
- **规范文件**：`docs/superpowers/specs/2026-07-05-api-docs-design.md`
- **执行方式**：isolated worktree (`feature/api-docs`) + subagent-driven-development
- **开始时间**：2026-07-06
- **完成时间**：2026-07-06

## 任务清单

- [x] Task 1: 安装并配置 @nestjs/swagger + @scalar/nestjs-api-reference
- [x] Task 2: 在 `main.ts` 生成 OpenAPI document 并挂载 Scalar 到 `/docs`
- [x] Task 3: 为所有 DTO 显式标注 `ApiProperty`（兼容 tsx watch 的 `isolatedModules`）
- [x] Task 4: 为所有 Controller 添加 `ApiTags`/`ApiOperation`/`ApiBearerAuth` 等注解
- [x] Task 5: 修复 `DictModule` 因缺少 `JwtProvider`/`RedisSessionProvider` 导致的运行时依赖错误
- [x] Task 6: 修复 `login.dto.ts` 的 `isolatedModules` 类型重导出警告
- [x] Task 7: 修复 `operation-log.interceptor.ts` 中 `module` 变量命中的 `@next/next/no-assign-module-variable` lint 规则
- [x] Task 8: 清理未使用的 `swagger-ui-dist` 依赖并更新 lockfile
- [x] Final: 全量代码 review、提交、合并到 dev、清理 worktree、关闭 GitHub Issue #24

## 完成记录

### Task 1: 文档依赖与入口配置
- **相关文件**：
  - `apps/api/package.json`
  - `apps/api/src/main.ts`
- **审阅**: ✅ OpenAPI document 在 `NODE_ENV !== production` 时生成；Scalar 挂载在 `/docs`，默认暗色主题

### Task 2: DTO 与 Controller 注解
- **相关文件**：
  - `apps/api/src/modules/**/dtos/*.ts`
  - `apps/api/src/modules/**/*controller.ts`
- **审阅**: ✅ 所有请求/响应 DTO 均显式声明 `type`，所有 controller 均有 tag 与操作说明；`LoginDto` schema 在 Scalar 中正确渲染

### Task 3: 依赖注入修复
- **相关文件**：
  - `apps/api/src/modules/auth/auth.module.ts`
  - `apps/api/src/modules/dict/dict.module.ts`
- **审阅**: ✅ `AuthModule` 导出 `JwtProvider` 与 `RedisSessionProvider`；`DictModule` 导入 `AuthModule` 以使用 session/redis 能力

### Task 4: 工程化清理
- **相关文件**：
  - `apps/api/src/modules/auth/dtos/login.dto.ts`
  - `apps/api/src/modules/monitor/interceptors/operation-log.interceptor.ts`
  - `apps/api/package.json`
  - `pnpm-lock.yaml`
- **审阅**: ✅ 类型导出改为 `export type`；`module` 变量重命名为 `moduleName`；移除 `swagger-ui-dist`

### Final: 全量代码 review
- **验证结果**: ✅ `pnpm typecheck` 通过、`pnpm --filter @sekiro/api test` 101/101 通过、api lint 通过
- **合并提交**: `39cbdd1`
- **GitHub Issue**: [#24](https://github.com/eggacher/Sekiro/issues/24) 已关闭


---

# Story #27: 安全基线（限流/安全头/上传校验）— 执行进度

## 计划信息
- **计划文件**：`docs/superpowers/plans/2026-07-07-story-27-security-baseline.md`
- **执行方式**：subagent-driven-development
- **工作区**：`/Users/zero/projects/Sekiro/.worktrees/story/27-security-baseline`
- **开始时间**：2026-07-07

## 任务清单

- [x] Task 1: Install Dependencies
  - **Commit**: `182e0ac`
  - **审阅**: ✅ 依赖安装正确，lockfile 已更新
- [x] Task 2: AES-256-GCM Config Encryption Utility
  - **Commit**: `22dde2e`
  - **审阅**: ✅ 实现符合 brief，测试覆盖 round-trip / 非 ENC 透传 / 格式错误 / auth tag 篡改
  - **Minor 待 final review 关注**: `decryptConfig` 对非 ENC 值做了 `.trim()`；base64/hex 优先级存在潜在歧义；测试可扩展错误密钥/篡改密文/不同 key 派生路径
- [x] Task 3: Encrypted Config Loader
  - **Commit**: `568ffee`
  - **审阅**: ✅ 实现符合 brief；正确修复了 brief 中遗漏的明文透传分支
  - **Minor 待 final review 关注**: 空字符串环境变量处理从 `!value` 改为 `=== undefined`；测试修改全局 process.env
- [x] Task 4: Redis Throttler Storage
  - **Commits**: `12fe783`, `fd92e63`, `5890616`
  - **审阅**: ✅ 正确实现 @nestjs/throttler v6 合约；MULTI/EXEC 原子递增 + 阻塞键 + 秒级 TTL
  - **Important 待后续修复或 final review 关注**: 测试未验证 Redis 命令调用（incr/pExpire/pTTL/set）；缺少 timeToBlockExpire 断言；key-prefix 测试较弱
  - **Minor 待 final review 关注**: `ThrottlerStorageRecord` 使用 deep import；测试 mock 有冗余
- [x] Task 5: SecurityModule Scaffold and Global Registration
  - **Commit**: `5ff10cf`
  - **审阅**: ✅ 模块、index、AppModule 提取、main.ts 全局注册均符合 brief
- [x] Task 6: Throttler Exception Filter
  - **Commits**: `1c99b57`, `82ba385`, `e2d7a16`
  - **审阅**: ✅ 正确将 ThrottlerException 映射为 code 429；使用 `@sekiro/shared` 的 `ApiResponse` 类型
  - **Minor 待 final review 关注**: 测试中 `as any` cast 可改进
- [x] Task 7: Apply @Throttle and @SkipThrottle
  - **Commits**: `5a0bafd`, `fce9f7d`
  - **审阅**: ✅ 登录接口应用 v6 风格 @Throttle；健康检查跳过限流并返回 ApiResponse
  - **Minor 待 final review 关注**: HealthController 内联 envelope；Swagger 未标注 429；/health 可能被操作日志拦截器记录
- [x] Task 8: File Upload Validation
  - **Commit**: `622de57`
  - **审阅**: ✅ 实现符合 brief；动态导入 file-type；上传校验顺序正确
  - **Minor 待 final review 关注**: 测试用例未完全隔离单个校验逻辑（.exe 同时触发扩展名黑名单）；可加强异常消息断言；UPLOAD_MAX_SIZE 非法值可能变为 NaN
- [x] Task 9: Config Encryption CLI
  - **Commit**: `79dccef`
  - **审阅**: ✅ CLI 脚本与 package.json 脚本均符合 brief
  - **Minor 待 final review 关注**: 通过 argv 传入明文存在历史记录泄漏风险；dotenv 信息输出可能污染管道
- [x] Task 10: Frontend CSP Nonce Middleware
  - **Commit**: `c53d9f6`
  - **审阅**: ✅ middleware、layout、next.config.js 均符合 brief；CSP 开发/生产分离正确
  - **Minor 待 final review 关注**: layout.tsx 中 AuthProvider JSX 被意外重排格式；nonce 由 UUID base64 生成，可改用随机字节
- [x] Task 11: Environment Variables and Documentation
  - **Commit**: `ff6f3f0`
  - **审阅**: ✅ `.env.example` 正确追加 4 个安全相关环境变量
- [x] Task 12: Security Headers Integration Test
  - **Commit**: `f638311`
  - **审阅**: ✅ 集成测试覆盖 helmet 安全头；提取 `configureApp` helper 统一生产与测试配置
  - **Re-review 争议与结论**: reviewer 质疑 `SecurityModule` 导入 `AuthModule` 会造成循环依赖。经核查 `AuthModule` 未导入 `SecurityModule`，依赖方向为单向；`UploadController` 使用 `JwtAuthGuard` 需要 `AuthModule`，导入合理。
- [x] Task 13: Final Verification
  - **Commit**: `b73f6ae`
  - **审阅**: ✅ `pnpm typecheck` 通过、`pnpm lint` 通过、`pnpm --filter @sekiro/api test` 117/117 通过
  - **额外修复**: `.eslintrc.json` 增加 `"root": true`，避免 worktree 嵌套目录中 ESLint 解析到父目录配置导致 plugin 冲突
- [x] Review Fixes
  - **Commit**: `8ddb54f`
  - **修复内容**:
    1. `ThrottlerStorageRedisService` 改用原子 Lua 脚本，在自增前检查 block key，解决 blockDuration > ttl 时阻塞被绕过的漏洞
    2. 将 `@nestjs/throttler/dist/...` 深导入替换为内联 `ThrottlerStorageRecord` 接口
    3. 新增 `FileValidationException` / `FileValidationExceptionFilter`，文件校验失败返回 HTTP 200 + 业务 code 422 的 `ApiResponse`
    4. `UploadController` Swagger 注解同步为 200 + code 422
  - **验证**: `pnpm typecheck` 通过、`pnpm lint` 通过、`pnpm --filter @sekiro/api test` 119/119 通过
- [ ] Final: 全量代码 review

## 完成记录
