# GitHub Issues 同步状态

**同步日期**：2026-07-08  
**执行人**：Kimi Code CLI (superpowers:subagent-driven-development)  
**目的**：追踪 GitHub Issue 与本地工作的关联关系

---

## 📌 Story #5: DB 初始化（已完成）

### 概览

| 维度 | 信息 |
|------|------|
| **Story** | #5 DB 初始化 |
| **Epic** | #1 基础设施 |
| **Milestone** | v0.1 MVP |
| **状态** | ✅ **完成** |
| **完成时间** | 2026-07-05 |
| **相关 Issue** | #10, #13, #14 |

### 关联的 GitHub Issues

#### Issue #10: Prisma 初始化与 schema.prisma 起草

| 字段 | 值 |
|------|-----|
| **标题** | Prisma 初始化与 schema.prisma 起草 |
| **类型** | Task (Story #5 的子任务) |
| **状态** | ✅ **应更新为 Done** |
| **完成时间** | 2026-07-05 |
| **本地文件** | `docs/superpowers/specs/2026-07-04-prisma-schema-design.md` |
| **本地完成报告** | `.superpowers/sdd/FINAL_COMPLETION_REPORT.md` |
| **相关 Commits** | 63be6d0（Task 1 PrismaService）、7141650（Task 2 初始框架）等 |

**完成内容**：
- ✅ `schema.prisma` 完整实现（14 个 model）
- ✅ 所有关键字段、关系、约束正确定义
- ✅ TypeScript schema 类型生成
- ✅ Schema 结构测试通过 (`apps/api/prisma/schema.test.ts`)

---

#### Issue #13: Seed 数据初始化

| 字段 | 值 |
|------|-----|
| **标题** | Seed 数据初始化（110+ 条示例数据） |
| **类型** | Task (Story #5 的子任务) |
| **状态** | ✅ **应更新为 Done** |
| **完成时间** | 2026-07-05 |
| **本地文件** | `apps/api/prisma/seed.ts` |
| **本地完成报告** | `.superpowers/sdd/FINAL_COMPLETION_REPORT.md` + `task-3-report.md` |
| **相关 Commits** | 0e45b1b、bea7507、d37b7c5（含修复） |

**完成内容**：
- ✅ 110+ 条完整示例数据（部门、用户、角色、菜单、权限、日志等）
- ✅ 12 个执行步骤，所有步骤验证通过
- ✅ 密码策略实现（bcrypt cost=10，超管固定、其他随机）
- ✅ 可重复执行验证通过
- ✅ 数据完整性验证（所有外键关系正确）

**数据统计**：
```
部门: 10 条      用户: 12 条     角色: 7 条
岗位: 6 条       菜单: 16 条     字典: 13 条
用户-角色: 13 条  用户-岗位: 12 条  角色-菜单: 49 条
登录日志: 12 条   操作日志: 10 条

总计: ~120 条完整示例数据
```

---

#### Issue #14: PrismaService 注入层

| 字段 | 值 |
|------|-----|
| **标题** | PrismaService NestJS 注入层 |
| **类型** | Task (Story #5 的子任务) |
| **状态** | ✅ **应更新为 Done** |
| **完成时间** | 2026-07-05 |
| **本地文件** | `apps/api/src/modules/prisma/` |
| **本地完成报告** | `.superpowers/sdd/FINAL_COMPLETION_REPORT.md` |
| **相关 Commits** | 63be6d0（Task 1）|

**完成内容**：
- ✅ `PrismaService`：继承 PrismaClient，自动生命周期管理
  - 文件：`apps/api/src/modules/prisma/prisma.service.ts`
  - 特性：OnModuleInit（自动连接）、OnModuleDestroy（自动断开）
  
- ✅ `PrismaModule`：NestJS 模块定义，支持依赖注入
  - 文件：`apps/api/src/modules/prisma/prisma.module.ts`
  - 特性：providers + exports，支持导入到 AppModule
  
- ✅ 导出统一接口
  - 文件：`apps/api/src/modules/prisma/index.ts`

**技术特点**：
- 使用 Prisma v7 的 `@prisma/adapter-pg` (PrismaPg)
- 支持连接池、性能优化
- 完全与 NestJS DI 集成

---

### 汇总状态

| Issue | 标题 | 本地完成 | GitHub 状态 | 应更新为 |
|-------|------|---------|-----------|---------|
| #10 | Prisma schema | ✅ 完成 | ✅ Closed | ✅ Closed |
| #13 | Seed 数据 | ✅ 完成 | ✅ Closed | ✅ Closed |
| #14 | PrismaService | ✅ 完成 | ✅ Closed | ✅ Closed |
| **Story #5** | **DB 初始化** | **✅ 完成** | **✅ Closed** | **✅ Closed** |
| **Story #6** | **Auth 登录接口** | **✅ 完成** | **✅ Closed** | **✅ Closed** |
| **Story #7** | **User 用户管理** | **✅ 完成** | **✅ Closed** | **✅ Closed** |
| **Story #8** | **Role 角色管理** | **✅ 完成** | **✅ Closed** | **✅ Closed** |
| **Story #9** | **Menu 菜单管理** | **✅ 完成** | **✅ Closed** | **✅ Closed** |
| **Story #16** | **前端基建（mock 切真实 API + 工程化）** | **✅ 完成** | **✅ Closed** | **✅ Closed** |
| **Story #17** | **Dept & Position 部门与岗位** | **✅ 完成** | **✅ Closed** | **✅ Closed** |
| **Story #15** | **个人中心（资料/改密/通知偏好）** | **✅ 完成** | **✅ Closed** | **✅ Closed** |
| **Story #18** | **数据字典管理** | **✅ 完成** | **✅ Closed** | **✅ Closed** |
| **Story #19** | **数据权限 DataScope 完整实现** | **✅ 完成** | **✅ Closed** | **✅ Closed** |
| **Story #20** | **系统监控：在线用户** | **✅ 完成** | **✅ Closed** | **✅ Closed** |
| **Story #21** | **系统监控：操作日志** | **✅ 完成** | **✅ Closed** | **✅ Closed** |
| **Story #22** | **系统监控：登录日志** | **✅ 完成** | **✅ Closed** | **✅ Closed** |
| **Story #23** | **系统监控：服务监控** | **✅ 完成** | **✅ Closed** | **✅ Closed** |
| **Story #24** | **API 文档（OpenAPI + Scalar）** | **✅ 完成** | **✅ Closed** | **✅ Closed** |
| **Story #26** | **Docker 部署 + CI/CD** | **✅ 完成** | **✅ Closed** | **✅ Closed** |
| **Story #27** | **安全基线（限流/安全头/上传校验）** | **✅ 完成** | **✅ Closed** | **✅ Closed** |
| **Story #31** | **在用户管理中查看和分配岗位** | **✅ 完成** | **✅ Closed** | **✅ Closed** |
| **Story #25** | **代码生成器** | **❌ 放弃** | **✅ Closed** | **✅ Closed** |
| **Story #28** | **i18n 国际化 + 主题切换** | **✅ 完成** | **✅ Closed** | **✅ Closed** |
| **Story #32** | **MFA / TOTP 二步验证** | **✅ 完成** | **✅ Closed** | **✅ Closed** |
| **Story #35** | **按钮级权限控制** | **✅ 完成** | **✅ Closed** | **✅ Closed** |
| - | **CrudTable 表格模糊搜索** | **✅ 完成** | **✅ Closed** | **✅ Closed** |
| - | **数据字典状态视觉标识** | **✅ 完成** | **✅ Closed** | **✅ Closed** |
| - | **数据库密码重置脚本** | **✅ 完成** | **✅ Closed** | **✅ Closed** |
| - | **清理在线用户记录** | **✅ 完成** | **✅ Closed** | **✅ Closed** |

## Epic 状态汇总

| Epic | 标题 | 状态 | 说明 |
| --- | --- | --- | --- |
| **#1** | 后端基础设施: NestJS + Prisma + PG + Redis 全链路打通 | **✅ Closed** | #24/#26/#28 已完成 |
| **#2** | v0.1 MVP: 登录鉴权 + RBAC + 用户/角色/菜单 | **✅ Closed** | 下辖 Story #5~9、#15、#16 全部完成 |
| **#3** | v0.5 生产就绪: 部门/字典/监控/数据权限/Swagger/代码生成器 | **✅ Closed** | #19、#24、#26、#27、#28 已全部完成并关闭 |
| **#4** | v1.0 GA: 测试/监控/MFA/部署 | **IN_PROGRESS** | MFA/TOTP 二步验证 (#32) 已完成 |

## Task 状态汇总（Story #5 子任务）

| Task | 标题 | 状态 |
| --- | --- | --- |
| #10 | Prisma 初始化与 schema.prisma 起草 | ✅ Closed |
| #11 | docker-compose 起 PG/Redis + 连接验证 | ✅ Closed |
| #12 | 迁移脚本与 pnpm db:* 命令 | ✅ Closed |
| #13 | seed 种子数据(超管+角色+菜单+部门+字典) | ✅ Closed |
| #14 | PrismaService 全局封装 + /ping 打通全链路 | ✅ Closed |

> **Story #25 放弃原因**：在 Vibe Coding / AI 辅助开发成为主流的背景下，手动代码生成器的维护成本高于收益。AI 已能根据 schema 和 prompt 直接生成符合项目规范的 CRUD 代码，且更灵活。

---

## 🚀 后续 Story

### Story #18: 数据字典管理 (已完成)

| 维度 | 信息 |
|------|------|
| **Story** | #18 数据字典管理 |
| **Epic** | #3 v0.5 生产就绪 |
| **Milestone** | v0.5 生产就绪 |
| **状态** | ✅ **已完成** |
| **依赖** | Story #7 (User) & Story #8 (Role) ✅ 已完成 |
| **相关文档** | `docs/SPEC.md` §4.5 (Dict 接口规范) |

---

## 📋 待办：GitHub 更新清单

### 需要执行的操作

- [x] **更新 Issue #10 / #13 / #14** (已关闭)
- [x] **关闭 Story #5** (已关闭)
- [x] **关闭 Story #6 (Auth 登录接口)** (已关闭)
- [x] **关闭 Story #7 (User 用户管理)** (已关闭)
- [x] **关闭 Story #8 (Role 角色管理)** (已关闭)
- [x] **关闭 Story #9 (Menu 菜单管理)** (已关闭)
- [x] **关闭 Story #17 (Dept & Position 部门与岗位)** (已关闭)
- [x] **创建/推进 Story #18: 数据字典管理**
  - 标题：`Story #18: 数据字典管理`
  - 描述：字典类型与字典项的 CRUD，及字典项快速检索组件等。
- [x] **关闭 Story #16 (前端基建)**
  - 标题：`Story #16: 前端基建（mock 切真实 API + 工程化）`
  - 描述：Next.js 代理、真实 API 调用、401/403/422 统一处理、真实菜单驱动、零业务 import mock。
- [x] **关闭 Story #15 (个人中心)** (已关闭)
  - 标题：`Story #15: 个人中心（资料/改密/通知偏好）`
  - 描述：个人中心三个 Tab，基本信息可改，安全改密需旧密码+二次确认并强制重新登录，通知偏好 4 类开关，头像上传（base64）。
- [x] **关闭 Story #19: 数据权限 DataScope 完整实现** (已关闭)
  - 标题：`Story #19: 数据权限 DataScope 完整实现`
  - 描述：角色数据范围设置、用户/部门列表按数据权限裁剪、自定义部门范围持久化。
- [x] **关闭 Epic #2: v0.1 MVP** (已关闭)
  - 标题：`🎯 [Epic] v0.1 MVP: 登录鉴权 + RBAC + 用户/角色/菜单`
  - 说明：下辖 Story #5~9、#15、#16 全部完成。
- [x] **关闭 Story #5 子任务 Task #10~14** (已关闭)
  - 标题：`Task: Prisma 初始化 / docker-compose / 迁移脚本 / seed / PrismaService`
  - 说明：这些 task 随 Story #5 完成，已在 GitHub 同步关闭。
- [x] **关闭 Story #20~#23 (系统监控与日志)**
  - 标题：`Story #20~#23: 系统监控与日志`
  - 描述：在线用户、操作日志、登录日志、服务监控模块已随 Story #18 之前实现并关闭。
- [x] **关闭 Story #26 (Docker 部署 + CI/CD)** (已关闭)
  - 标题：`Story #26: Docker 部署 + CI/CD`
  - 描述：API/Web 生产级 Dockerfile、docker-compose 编排、/health 健康检查、宿主机迁移路径。
- [x] **关闭 Story #27 (安全基线)** (已关闭)
  - 标题：`Story #27: 安全基线(限流/安全头/上传校验)`
  - 描述：接口限流、helmet 安全头、文件上传校验、加密配置、SecurityModule/UploadModule。
- [x] **关闭 Story #25 (代码生成器)** (已放弃)
  - 标题：`Story #25: 代码生成器（脚手架杀手锏）`
  - 描述：在 Vibe Coding / AI 辅助开发时代，手动代码生成器维护成本高于收益，不再实现。
- [x] **关闭 Story #31 (在用户管理中查看和分配岗位)** (已关闭)
  - 标题：`Story #31: 在用户管理中查看和分配岗位`
  - 描述：后端 UserRepository 返回 positionIds；前端用户列表展示岗位、表单支持岗位多选、保存时顺序分配岗位。

---

## 📌 Story #31: 在用户管理中查看和分配岗位（已完成）

### 概览

| 维度 | 信息 |
|------|------|
| **Story** | #31 在用户管理中查看和分配岗位 |
| **Epic** | #3 v0.5 生产就绪 |
| **Milestone** | v0.5 生产就绪 |
| **状态** | ✅ **已完成** |
| **依赖** | Story #7 (User) & Story #17 (Dept & Position) ✅ 已完成 |
| **相关文档** | `docs/superpowers/specs/2026-07-10-user-position-integration-design.md` |

### 完成内容

- ✅ 后端 `UserRepository.findPage` 与 `UserRepository.findById` 返回 `positionIds`
- ✅ 前端用户管理列表新增岗位列，异步加载岗位字典并渲染岗位名称
- ✅ 用户新增/编辑表单增加岗位多选（Checkbox 组）
- ✅ 保存用户时显式分离 `positionIds`，先保存用户 DTO，再调用岗位分配接口顺序写入
- ✅ 全量验证通过：`pnpm typecheck`、`pnpm lint`（仅 `apps/web`）、`pnpm --filter @sekiro/api test` 全部通过（122/122）
- **环境要求**: 项目保留原始 Node `>=18.17.0` 引擎要求；API 测试因本地 `std-env@4.2.0` 的 `require(ESM)` 兼容性，使用 Node 22 环境验证通过。

### 关联 Commits

- 岗位集成实现见 Task 1~4 报告
- 文档同步：`docs(sync): update progress and issue status for Story #31`

---

## 📌 Story #32: MFA / TOTP 二步验证（已完成）

### 概览

| 维度 | 信息 |
|------|------|
| **Story** | #32 MFA / TOTP 二步验证 |
| **Epic** | #4 v1.0 GA |
| **Milestone** | v1.0 GA |
| **状态** | ✅ **已完成** |
| **完成时间** | 2026-07-10 |
| **相关文档** | `docs/superpowers/specs/2026-07-10-mfa-design.md` |

### 完成内容

- ✅ 数据库用户表增加双因子认证字段（`mfaEnabled`, `mfaSecret`）并生成 migration。
- ✅ 后端实现基于 `otplib` 的 RFC 6238 TOTP 秘钥生成与一次性验证码校验。
- ✅ 登录鉴权链路分支化改造：检测到用户启用 MFA 时，挂起完整登录，改发临时 `mfaToken` 并在前端进行两步验证拦截。
- ✅ 个人中心集成：支持多渠道扫描二维码、显示 TOTP Secret Key、提供实时验证码启用/禁用 MFA 开关功能。
- ✅ API 全量单元测试并通过（142/142）。

---

## 📌 Story #35: 按钮级权限控制（已完成）

### 概览

| 维度 | 信息 |
|------|------|
| **Story** | #35 按钮级权限控制 |
| **Epic** | #2 v0.1 MVP |
| **Milestone** | v0.1 MVP |
| **状态** | ✅ **已完成** |
| **完成时间** | 2026-07-11 |
| **相关文档** | `docs/superpowers/specs/2026-07-11-button-level-permission-control-design.md` |

### 完成内容

- ✅ 共享包 `@sekiro/shared` 扩充 28 个细粒度按钮权限编码及 `SUPER_ADMIN_ROLE` 超管常量。
- ✅ 后端登录及 `/auth/me` 在 Session 结构中缓存扁平化的 `permissions` 及 `roles`，自动定时回写刷新。
- ✅ 后端开发 `@RequiresPermissions` + `PermissionGuard`，实现 O(1) 权限编码拦截，并对超管自动短路绕过。
- ✅ 后端对系统管理下辖的 7 个核心 Controller 共 28 个写操作方法添加权限守卫保护。
- ✅ 种子数据增加 25 个按钮类型菜单，并将全量 28 个权限赋予超管及管理员角色。
- ✅ 前端编写 `usePermission()` hook 和 `<HasPermission>` 容器组件，并在用户、角色、菜单、部门、岗位、字典六大管理页面全面拦截“写/删/改”功能按钮。
- ✅ API 全量测试 184/184 通过，前端编译与 lint 正常。

---

## 📌 其它优化与清理（已完成）

### 概览

- **CrudTable 表格模糊搜索**：为前端 `CrudTable` 组件提供客户端模糊搜索包含查询支持（忽略大小写），仅下拉框保持精确过滤，提升用户检索体验。（完成于 2026-07-10）
- **数据字典状态视觉标识**：优化了字典管理中被停用字典类型列表的视觉标识（透明度淡化 + 追加红色 `[停用]` Badge），防止停用状态下缺乏视觉标识的问题。（完成于 2026-07-10）
- **数据库密码重置脚本**：为适应前端 MD5 登录规则升级，批量重置数据库内全部用户密码哈希值（admin 为 `admin123`，其他为 `sekiro123`），使其符合 `bcrypt(md5(明文))` 加密规范。（完成于 2026-07-10）
- **在线登录用户记录清理**：对本地运行中的 `sekiro-redis` 缓存的 `sekiro:session:*` 进行安全批量清除，强制让当前所有在线用户下线。（完成于 2026-07-11）

---

---

## 📊 本地文档映射表

### 规范文档

| 文件 | 关联 Issue | 说明 |
|------|-----------|------|
| `docs/superpowers/specs/2026-07-04-prisma-schema-design.md` | #10 | Prisma schema 详细设计 |
| `docs/superpowers/specs/2026-07-05-prisma-service-and-seed-design.md` | #13, #14 | PrismaService + Seed 详细设计 |
| `docs/superpowers/specs/2026-07-05-auth-login-design.md` | Story #6 | Auth 模块详细设计 |
| `docs/superpowers/specs/2026-07-05-user-management-design.md` | Story #7 | User 模块详细设计 |
| `docs/superpowers/specs/2026-07-05-role-management-design.md` | Story #8 | Role 模块详细设计 |
| `docs/superpowers/specs/2026-07-05-menu-management-design.md` | Story #9 | Menu 模块详细设计 |
| `docs/superpowers/specs/2026-07-05-dept-position-design.md` | Story #17 | Dept & Position 模块详细设计 |
| `docs/superpowers/specs/2026-07-05-dict-management-design.md` | Story #18 | 数据字典管理详细设计 |
| `docs/superpowers/specs/2026-07-05-data-scope-design.md` | Story #19 | 数据权限 DataScope 详细设计 |
| `docs/superpowers/specs/2026-07-05-system-monitor-design.md` | Story #20~#23 | 系统监控与日志详细设计 |
| `docs/superpowers/specs/2026-07-05-api-docs-design.md` | Story #24 | API 文档（OpenAPI + Scalar）详细设计 |
| `docs/superpowers/specs/2026-07-07-docker-ci-design.md` | Story #26 | Docker 部署 + CI/CD 详细设计 |
| `docs/superpowers/specs/2026-07-07-story-27-security-baseline-design.md` | Story #27 | 安全基线（限流/安全头/上传校验）详细设计 |
| `docs/superpowers/specs/2026-07-10-user-position-integration-design.md` | Story #31 | 用户管理岗位集成详细设计 |
| `docs/superpowers/specs/2026-07-10-mfa-design.md` | Story #32 | MFA/TOTP 二步验证详细设计 |
| `docs/superpowers/specs/2026-07-11-button-level-permission-control-design.md` | Story #35 | 按钮级权限控制详细设计 |
| `docs/superpowers/specs/2026-07-10-crud-table-fuzzy-search-design.md` | - | CrudTable 表格模糊搜索设计方案 |
| `docs/superpowers/specs/2026-07-10-dict-status-indicator-design.md` | - | 数据字典类型状态视觉标识设计方案 |
| `docs/superpowers/specs/2026-07-10-reset-passwords-design.md` | - | 数据库密码重置设计方案 |
| `docs/superpowers/specs/2026-07-11-clear-online-users-design.md` | - | 清理在线用户记录设计方案 |

### 实施计划

| 文件 | 关联 Issue | 说明 |
|------|-----------|------|
| `docs/superpowers/plans/2026-07-05-prisma-service-and-seed.md` | #13, #14 | Story #5 实施计划 |
| `docs/superpowers/plans/2026-07-05-auth-login-implementation.md` | Story #6 | Story #6 实施计划 |
| `docs/superpowers/plans/2026-07-05-user-management.md` | Story #7 | Story #7 实施计划 |
| `docs/superpowers/plans/2026-07-05-role-management.md` | Story #8 | Story #8 实施计划 |
| `docs/superpowers/plans/2026-07-05-menu-management.md` | Story #9 | Story #9 实施计划 |
| `docs/superpowers/plans/2026-07-05-dept-position.md` | Story #17 | Story #17 实施计划 |
| `docs/superpowers/plans/2026-07-05-dict-management.md` | Story #18 | Story #18 实施计划 |
| `docs/superpowers/plans/2026-07-05-frontend-infrastructure.md` | Story #16 | Story #16 实施计划 |
| `docs/superpowers/plans/2026-07-05-system-monitor.md` | Story #20~#23 | 系统监控与日志实施计划 |
| `docs/superpowers/plans/2026-07-05-api-docs.md` | Story #24 | Story #24 实施计划 |
| `docs/superpowers/plans/2026-07-07-docker-ci.md` | Story #26 | Story #26 实施计划 |
| `docs/superpowers/plans/2026-07-07-story-27-security-baseline.md` | Story #27 | Story #27 实施计划 |
| `docs/superpowers/plans/2026-07-10-user-position-integration.md` | Story #31 | Story #31 实施计划 |
| `docs/superpowers/plans/2026-07-10-mfa-implementation.md` | Story #32 | Story #32 实施计划 |
| `docs/superpowers/plans/2026-07-11-button-level-permission-control.md` | Story #35 | Story #35 实施计划 |
| `docs/superpowers/plans/2026-07-10-crud-table-fuzzy-search.md` | - | CrudTable 表格模糊搜索实施计划 |
| `docs/superpowers/plans/2026-07-10-dict-status-indicator.md` | - | 数据字典状态视觉标识实施计划 |
| `docs/superpowers/plans/2026-07-10-reset-passwords.md` | - | 数据库密码重置实施计划 |
| `docs/superpowers/plans/2026-07-11-clear-online-users.md` | - | 清理在线登录用户记录实施计划 |

### 完成报告

| 文件 | 关联 Issue | 说明 |
|------|-----------|------|
| `.superpowers/sdd/FINAL_COMPLETION_REPORT.md` | Story #5 | Story #5 最终完成总结 |
| `.superpowers/sdd/progress.md` | Story #5 | Story #5 进度账本 |
| `.superpowers/sdd/walkthrough.md` | Story #6, #7, #8, #9, #17 | 核心模块功能测试与 TDD 验证汇总 |

---

## 📝 更新记录

| 日期 | 事项 | 执行人 |
|------|------|--------|
| 2026-07-05 | 创建本同步文档 | Zed Agent |
| 2026-07-05 | 完成 Story #6 并更新本地进度记录 | Antigravity |
| 2026-07-05 | 完成 Story #7 与 Story #8，同步关闭 GitHub Issues | Antigravity |
| 2026-07-05 | 完成 Story #9，同步关闭 GitHub Issues | Antigravity |
| 2026-07-05 | 完成 Story #17，同步关闭 GitHub Issues | Antigravity |
| 2026-07-05 | 完成 Story #18，同步关闭 GitHub Issues | Antigravity |
| 2026-07-05 | 完成 Story #16，同步关闭 GitHub Issues；修正 Story #19 映射（数据权限 OPEN，系统监控拆为 #20~#23 CLOSED） | Antigravity |
| 2026-07-05 | 完成 Story #15，同步关闭 GitHub Issues | Agent |
| 2026-07-05 | 关闭 Story #25（代码生成器，因 Vibe Coding 放弃）| Agent |
| 2026-07-05 | 补关闭 GitHub #15、#16（此前本地已标记 Closed 但远程未关）| Agent |
| 2026-07-06 | 确认 Story #19（数据权限 DataScope）实现已完成，同步关闭本地 GitHub Issues 状态 | Agent |
| 2026-07-06 | 远程关闭 Epic #2、Story #19、Task #10~14（其中 #10/#13/#14 此前已关）；同步更新本地 Epic/Task 汇总 | Agent |
| 2026-07-06 | 将 Story #24 标题从 "Swagger/OpenAPI 在线文档" 更新为 "API 文档（OpenAPI + Scalar）"，替换 Swagger UI 为 Scalar | Agent |
| 2026-07-06 | 完成 Story #24（OpenAPI + Scalar）并合并到 dev；关闭 GitHub Issue #24；更新本地 Epic 与进度状态 | Agent |
| 2026-07-07 | 完成 Story #26（Docker 部署）并合并到 dev；关闭 GitHub Issue #26；更新本地 Epic 与进度状态 | Agent |
| 2026-07-07 | 检测并同步 Story #27 状态：关闭 GitHub Issue #27，更新本地 GITHUB_ISSUES_STATUS.md 与文档映射表 | Agent |
| 2026-07-10 | 完成 Story #31（用户管理岗位集成）；全量验证通过；更新本地进度与 GitHub Issues 状态 | Agent |
| 2026-07-10 | 完成 Story #32（MFA / TOTP 二步验证）实施并合并到 dev，关闭 GitHub Issue #32 | Agent |
| 2026-07-10 | 完成 CrudTable 模糊搜索、数据字典视觉指示、数据库密码重置等优化项 | Agent |
| 2026-07-11 | 完成 Story #35（按钮级权限控制）实施并合并到 dev，关闭 GitHub Issue #35 | Agent |
| 2026-07-11 | 执行在线登录用户记录一键清理 | Antigravity |

---

## 🔗 相关链接

**GitHub 项目**：https://github.com/eggacher/Sekiro

**Issue 列表**：
- https://github.com/eggacher/Sekiro/issues/10
- https://github.com/eggacher/Sekiro/issues/13
- https://github.com/eggacher/Sekiro/issues/14
- https://github.com/eggacher/Sekiro/issues?q=is%3Aissue+label%3Astory (Story 列表)

---

**注**：本文件是本地工作记录与 GitHub Issues 的桥梁。每当完成一个 Story/Task 时，应更新此文件并同步到 GitHub。
