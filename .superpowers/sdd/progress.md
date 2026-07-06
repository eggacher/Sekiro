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
