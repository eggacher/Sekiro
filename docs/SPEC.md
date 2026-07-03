# Sekiro 工程实施规格（SPEC）

> **文档定位**：本文档是 Sekiro 脚手架的**工程实施规格**，目的不是重复"做什么"（见 `PRD.md`）或"为什么这样建模"（见 `DOMAIN_MODEL.md`），而是规定**怎么实现才算对**——数据契约、接口契约、状态机、校验规则、不变量、验收用例。
>
> **输入来源**：`PRD.md`、`DOMAIN_MODEL.md`、`FEATURES.md`、`packages/shared/`（已定义的类型/枚举）、`apps/web/`（已实现的原型）。
> **约束**：本文档与 `packages/shared/src/types.ts` 必须保持一致；如有冲突，以 shared 为单一来源，本文档同步更新。
>
> **版本**：v1.0 ｜ **日期**：2026-07-04 ｜ **状态**：基准（Baseline）

---

## 0. 如何阅读本文档

| 你是 | 重点看 |
| --- | --- |
| 后端工程师 | §3 数据模型、§4 接口契约、§5 业务规则、§7 安全 |
| 前端工程师 | §4 接口契约、§6 前端契约、§8 状态机（影响 UI） |
| QA | §9 验收用例（直接转测试用例） |
| 架构评审 | §1 范围、§2 架构、§5 不变量、§10 取舍 |

**优先级语义**（与 PRD 一致）：P0 = MVP 必备；P1 = 推荐增强；P2 = 锦上添花。本 spec 对 P0/P1 给出完整契约，P2 仅给出占位。

---

## 1. 范围与边界

### 1.1 本规格覆盖

- §3 数据模型（ER + 字段 + 约束，对应 `DOMAIN_MODEL.md §3.5` 领域类）
- §4 接口契约（RESTful，出入参与 `@sekiro/shared` 类型一一对应）
- §5 业务规则与不变量（对应 `DOMAIN_MODEL.md §3.6`）
- §6 前端契约（与 `apps/web` 已实现原型对齐）
- §7 安全规格、§8 状态机、§9 验收用例

### 1.2 不覆盖（明确排除）

- 具体后端框架代码（NestJS / Spring Boot / Go 待定，见 §11 开放问题 OP-1）
- 部署运维细节（见 `PRD.md §4.10`，本 spec 只约束 `/health` 契约）
- P2 功能的完整契约（代码生成器、定时任务、SSO 等仅占位）

### 1.3 名词约定

| 术语 | 含义 |
| --- | --- |
| 实体 | 有独立标识的领域对象（User、Role...），对应一张主表 |
| 值对象 | 无标识、不可变（DataScope 规则），依附实体存在 |
| 聚合 | 一致性边界，外部只引用聚合根 ID |
| 不变量 | 系统任何时刻都必须成立的规则（§5.3） |

---

## 2. 架构约束

### 2.1 Monorepo 分包（已落地）

```
apps/web     @sekiro/web    前端，Next.js 14（已就绪）
apps/api     @sekiro/api    后端（待实现，按领域模块组织）
packages/shared  @sekiro/shared  前后端共享类型/枚举/常量（单一来源）
```

### 2.2 强制约定（CON-）

| 编号 | 约定 | 违反后果 |
| --- | --- | --- |
| CON-1 | 所有跨进程数据结构必须用 `@sekiro/shared` 的类型，禁止在 web/api 各自定义重复类型 | 类型漂移，前后端契约破裂 |
| CON-2 | 所有接口返回 `ApiResponse<T>`（见 §4.2） | 前端统一拦截失效 |
| CON-3 | 后端模块划分必须按领域（`modules/user`、`modules/role`...），禁止按技术层（`controllers/`、`services/` 全局堆放） | 改动不局部，违背 DDD |
| CON-4 | 数据访问必须经 ORM 参数化，禁止 SQL 字符串拼接 | SQL 注入（违反 F-SEC-03） |
| CON-5 | 密码、Token、密钥不得以明文出现在日志、响应、DB | 安全事故（违反 F-SEC-04） |
| CON-6 | 时间字段一律 ISO 8601 字符串（UTC），前端按需格式化 | 时区错乱 |

### 2.3 分层（后端 apps/api）

```
Controller（接口/校验） → Service（业务编排/不变量） → Repository（数据访问） → ORM/DB
```

- Controller 不含业务逻辑，只做协议转换与 DTO 校验。
- Service 是事务边界，不变量（§5.3）在此守护。
- Repository 不跨聚合。

---

## 3. 数据模型

> 字段类型用 TypeScript 表达，与 `@sekiro/shared` 一致。下表只列**业务字段**，技术字段（`id` 自增主键、`created_at`、`updated_at`、`deleted_at` 软删）每个实体默认都有，不再重复。

### 3.1 核心域：组织与权限治理

#### User（用户）

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| username | string | 唯一、3-32 位、`[a-zA-Z0-9_]` | 登录账号，不可改 |
| password_hash | string | 仅服务端、bcrypt cost≥10 | 永不出现在响应 |
| nickname | string | ≤32 | 显示名 |
| email | string | email 格式、可空 | |
| phone | string | 手机号格式、可空 | |
| avatar | string(URL) | 可空 | |
| dept_id | number FK→Dept | 可空 | 归属部门 |
| status | CommonStatus | 默认 enabled | 见状态机 §8.1 |
| last_login_at | string(ISO) | 可空 | |

关联：User **M—N** Role（中间表 `user_role`），User **M—N** Position（中间表 `user_position`）。

#### Role（角色）

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| name | string | 唯一、≤32 | |
| code | string | 唯一、`[a-z_]+` | 如 `admin` |
| description | string | 可空 | |
| data_scope | DataScopeType | 默认 self | 数据范围（值对象，§5.2） |
| custom_dept_ids | number[] | 仅 data_scope=custom 时有效 | |
| status | CommonStatus | 默认 enabled | |

关联：Role **M—N** Menu（中间表 `role_menu`，承载"可见菜单/按钮权限"）。

#### Menu（菜单/权限节点，方案 A 单一类）

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| parent_id | number FK→Menu | 可空（根） | 自关联树 |
| title | string | ≤32 | |
| type | MenuType | directory/menu/button | DOMAIN_MODEL §3.7 |
| path | string | type≠button 时必填 | 前端路由 |
| component | string | type=menu 时必填 | 页面组件路径 |
| icon | string | 可空 | lucide 图标名 |
| permission | string | type=button 时必填，格式 `模块:资源:动作` | |
| sort | number | ≥0 | |
| visible | boolean | 默认 true | |
| cache | boolean | 默认 true | 前端是否 keep-alive |
| status | CommonStatus | 默认 enabled | |

#### Dept（部门，树形）

| 字段 | 类型 | 约束 |
| --- | --- | --- |
| parent_id | number FK→Dept | 可空（根） |
| name | string | ≤32 |
| leader | string | 可空 |
| phone | string | 可空 |
| sort | number | ≥0 |
| status | CommonStatus | |

#### Position（岗位）

| 字段 | 类型 | 约束 |
| --- | --- | --- |
| name | string | ≤32 |
| code | string | 唯一、`[a-z_]+` |
| sort | number | ≥0 |
| status | CommonStatus | |

### 3.2 支撑域

#### DictType / DictItem（数据字典）

DictType：`id, name, code(唯一), status, remark, created_at`
DictItem：`id, type_id(FK→DictType), label, value, sort, status`

约束：`(type_id, value)` 联合唯一（同一字典下值不重复）。

#### SystemConfig（系统参数）

`key(唯一), value(text), remark, updated_at`。运行时可改、缓存加速。

### 3.3 通用域：认证与可观测

#### Session（会话）

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 会话标识（随 Redis 可选） |
| user_id | number FK | |
| token | string | 索引；过期自动清 |
| ip / location / browser / os | string | 采集自请求 |
| login_time / expire_time / last_active_time | string(ISO) | |

存储首选 Redis（可降级到 DB）。**在线用户 = 未过期的 Session 集合**。

#### LoginLog / OperationLog（仅追加）

LoginLog：`id, username, ip, location, browser, os, result(LoginResult), message, time`
OperationLog：`id, operator, module, type(OperationType), description, method, url, ip, cost(ms), status, time`

约束：日志只 INSERT 不 UPDATE/DELETE；按月分表或按时间分区（P2）。

---

## 4. 接口契约

### 4.1 通用约定

- Base URL：`/api`
- 认证：`Authorization: Bearer <token>`（除 `/auth/login`、`/auth/captcha`、`/health`）
- 内容类型：`application/json; charset=utf-8`
- 分页入参：`page`(默认1) + `pageSize`(默认10，上限100)
- 分页出参：`PageResult<T> { list, total, page, pageSize }`

### 4.2 统一响应（CON-2）

```ts
// 来自 @sekiro/shared
interface ApiResponse<T> { code: number; message: string; data: T }
```

| code | 含义 | HTTP 状态 |
| --- | --- | --- |
| 0 | 成功 | 200 |
| 1 | 通用失败 | 200 |
| 401 | 未登录/Token 失效 | 200 |
| 403 | 无权限 | 200 |
| 404 | 资源不存在 | 200 |
| 422 | 参数校验失败 | 200，data 含字段级错误 | 
| 500 | 服务器错误 | 200 |

> **设计取舍**：业务码全走 HTTP 200，前端只看 `code`。简化前端拦截器，避免网关层 HTTP 码语义混淆。`data` 在 422 时为 `{ field: string; message: string }[]`。

### 4.3 鉴权模块（auth）—— P0

| 方法 | 路径 | 入参 | 出参 data | 说明 |
| --- | --- | --- | --- | --- |
| POST | `/auth/login` | `LoginRequest` | `LoginResponse` | 见 §4.3.1 |
| POST | `/auth/logout` | — | `null` | 使当前 token 失效 |
| POST | `/auth/refresh` | `{ refreshToken }` | `{ token, expiresIn }` | P1 |
| GET | `/auth/captcha` | — | `{ id, image(base64) }` | P1，图形验证码 |
| GET | `/auth/me` | — | `CurrentUser` | 当前用户+权限+菜单 |

#### 4.3.1 POST /auth/login 规约（对应 UC-1）

请求：`LoginRequest { username, password, captcha?, captchaId?, remember? }`
响应：`LoginResponse { token, refreshToken?, expiresIn, user, permissions[], menus[] }`

业务流程（Service 层）：
1. 按 username 查 User；不存在 → 写 LoginLog(result=fail) → 返回 code=1「账号或密码错误」
2. 校验 status=enabled；停用 → 写 LoginLog(fail) → 返回 code=1「账号已停用」
3. 校验密码（bcrypt.compare）；不符 → 失败计数+1，写 LoginLog(fail)；超阈值（默认5）→ 置 status=locked 30 分钟 → 返回 code=1「密码错误，剩余 N 次」
4. 通过 → 创建 Session、签发 token、写 LoginLog(success)、更新 last_login_at
5. 返回 user（脱敏，无 password_hash）+ permissions（该用户所有角色权限并集）+ menus（按角色菜单并集构建的树）

### 4.4 用户模块（user）—— P0

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/system/user` | `system:user:list` | 分页+条件查询，受数据权限裁剪（§5.4） |
| GET | `/system/user/:id` | `system:user:list` | 详情 |
| POST | `/system/user` | `system:user:create` | 新增；校验 username 唯一 |
| PUT | `/system/user/:id` | `system:user:update` | 编辑；username 不可改 |
| DELETE | `/system/user/:id` | `system:user:delete` | 软删；禁止删自己/超级管理员 |
| PUT | `/system/user/:id/status` | `system:user:update` | 启停 |
| PUT | `/system/user/:id/reset-password` | `system:user:update` | 重置为初始密码 |
| PUT | `/system/user/:id/roles` | `system:user:assign-role` | 分配角色（数组替换） |

查询条件（GET `/system/user` 的 query）：`page, pageSize, keyword, deptId, status`。

### 4.5 角色 / 菜单 / 部门 / 岗位 / 字典 —— P0/P1

CRUD 路径模式同 §4.4（`/system/role`、`/system/menu`、`/system/dept`、`/system/position`、`/system/dict`、`/system/dict-item`），差异点：

| 模块 | 特殊接口 | 说明 |
| --- | --- | --- |
| role | `PUT /system/role/:id/menus` | 分配菜单/权限（数组替换） |
| role | `PUT /system/role/:id/data-scope` | 设置数据范围 |
| menu | 列表返回**树** | 非 flat list |
| dept | 列表返回**树** | 非删根/带子节点禁止删 |
| dict | `GET /system/dict/:code/items` | 前端下拉用，按 code 取项 |

### 4.6 监控模块 —— P1

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/monitor/online` | 在线会话列表（未过期 Session） |
| DELETE | `/monitor/online/:id` | 强制下线（使 Session 失效） |
| GET | `/monitor/login-log` | 分页查询登录日志 |
| GET | `/monitor/operation-log` | 分页查询操作日志 |
| GET | `/monitor/server` | 服务器指标（CPU/内存/磁盘/JVM） |

### 4.7 健康检查 —— P1（CON 级）

`GET /health` → `{ status: "up", uptime, db: "up"|"down", redis: "up"|"down" }`，HTTP 200/503。供容器探针用。

---

## 5. 业务规则与不变量

### 5.1 校验规则（DTO 级，返回 422）

| 实体.字段 | 规则 |
| --- | --- |
| User.username | 必填、3-32、`^[a-zA-Z0-9_]+$`、全库唯一 |
| User.email | 可空，非空时匹配 email 正则 |
| User.phone | 可空，非空时 `^\d{11}$` |
| Role.code / Position.code | 必填、`^[a-z][a-z0-9_]*$`、唯一 |
| Menu.permission | type=button 时必填，`^[a-z]+:[a-z]+:[a-z]+$` |
| Menu.path | type≠button 时必填，以 `/` 开头 |

### 5.2 数据权限（DataScope，值对象）

角色的 `data_scope` 决定该角色用户查询"业务数据"时的可见范围：

| 取值 | 含义 | 实现 |
| --- | --- | --- |
| all | 全部 | 不加过滤 |
| dept_and_below | 本部门及子部门 | 按部门树过滤 `dept_id IN (本部门+子孙)` |
| dept | 仅本部门 | `dept_id = 用户.dept_id` |
| self | 仅本人 | `creator_id = 当前用户` |
| custom | 自定义 | `dept_id IN (custom_dept_ids)` |

用户多角色时取**最宽**（并集）。仅作用于"业务数据"查询（用户列表、订单等），字典/菜单/角色配置本身不受限。

### 5.3 不变量（系统任何时刻必须成立）

| 编号 | 不变量 | 守护点 |
| --- | --- | --- |
| INV-1 | username 全库唯一 | DB 唯一索引 + Service 双检 |
| INV-2 | 用户最终权限 = 其所有角色权限的**并集** | 权限计算 |
| INV-3 | 菜单可见性 = 角色菜单并集 ∩ 菜单启用集 | 菜单树构建 |
| INV-4 | Menu / Dept 自关联树**无环** | 写入前环检测 |
| INV-5 | 删除非空目录/部门需先处理子节点 | 删除接口校验 |
| INV-6 | 停用的用户不可登录、停用的角色不参与权限计算 | 登录与权限计算 |
| INV-7 | 超级管理员账号不可删除、不可停用 | 删除/启停接口硬编码保护 |
| INV-8 | 同一字典下 (type_id, value) 唯一 | DB 联合唯一索引 |

### 5.4 数据权限裁剪流程（UC-2 扩展 1a）

```
查询业务数据 → 取当前用户角色集 → 计算最宽数据范围 → 注入到查询条件 → 返回
```

---

## 6. 前端契约

> 与 `apps/web` 已实现原型对齐。原型当前用 `lib/mock/*`，接入后端时把 mock 调用替换为 `lib/api/client.ts`，组件层零改动（CON-1 保证）。

### 6.1 接入约定

```ts
// apps/web/lib/api/client.ts（已就绪）
import { apiClient } from "@/lib/api/client";
const { list, total } = await apiClient.get<PageResult<User>>("/system/user?page=1&pageSize=10");
```

- 401 → 自动清 token、跳 `/login`
- 非 0 code → toast 错误、抛 reject
- 422 → 表单字段级错误回填

### 6.2 权限控制三层（与原型一致）

| 层 | 机制 | 数据来源 |
| --- | --- | --- |
| 路由级 | 路由 meta + 守卫 | `/auth/me` 返回的 menus |
| 菜单级 | 侧边栏按 menus 渲染 | 同上 |
| 按钮级 | `v-permission` / 组件判断 | `/auth/me` 返回的 permissions[] |

### 6.3 受影响的前端状态机

| 场景 | 触发 | 前端动作 |
| --- | --- | --- |
| 角色权限变更 | PUT `/role/:id/menus` 成功 | toast 提示"对相关用户刷新/重登后生效"（DOMAIN_MODEL §4.3） |
| 被强制下线 | 接口返回 401 | 清状态、跳登录、提示"会话已被管理员终止" |

---

## 7. 安全规格（P0 必须，P1 应当）

| 编号 | 项 | 规格 |
| --- | --- | --- |
| SEC-1 | 密码存储 | bcrypt cost≥10，或 argon2id；禁止可逆加密/明文 |
| SEC-2 | 初始/重置密码 | 服务端生成随机串或固定值，首次登录强制改密（P1） |
| SEC-3 | 登录防爆破 | 同账号 5 次失败锁 30 分钟；同 IP 限流（P1） |
| SEC-4 | Token | access 2h、refresh 7d；登出加入黑名单至过期 |
| SEC-5 | SQL 注入 | 强制 ORM 参数化（CON-4） |
| SEC-6 | XSS | 前端输出转义；富文本白名单过滤；CSP 头 |
| SEC-7 | CSRF | 若用 Cookie 方案，SameSite=Lax + 双提交 token |
| SEC-8 | 脱敏 | 响应去掉 password_hash；日志脱敏密码/token/身份证（CON-5） |
| SEC-9 | 上传校验 | 类型白名单 + 大小 + magic number（P1） |
| SEC-10 | 安全响应头 | Helmet 类：X-Frame-Options、HSTS、X-Content-Type-Options（P1） |

---

## 8. 状态机（影响 UI 与接口行为）

### 8.1 用户账号状态（DOMAIN_MODEL §4.1）

```
新建 → enabled
enabled ⇄ disabled（管理员启停）
enabled → locked（失败超限）→ enabled（到期/解锁，30 分钟）
disabled → *（删除，软删）
```

约束：locked 是临时态，到期自动回 enabled；不可手动置 locked。

### 8.2 角色"权限生效"生命周期（DOMAIN_MODEL §4.3）

```
权限已持久化（已修改）→ 用户刷新会话/重登 → 已生效
```

约束：旧会话仍持旧权限直到刷新——前端须提示，不可静默。

---

## 9. 验收用例（QA 可直接转测试）

> 格式：用例编号 ｜ 前置 ｜ 步骤 ｜ 预期。✅ 表示 P0 必测。

### 9.1 鉴权

| ID | 场景 | 预期 |
| --- | --- | --- |
| TC-AUTH-01 ✅ | 正确账密登录 | code=0，返回 token + user + permissions + menus |
| TC-AUTH-02 ✅ | 错误密码 | code=1，提示密码错误，写 LoginLog(fail) |
| TC-AUTH-03 ✅ | 停用账号登录 | code=1，提示已停用 |
| TC-AUTH-04 ✅ | 连续 5 次失败 | 第 5 次后账号 locked 30 分钟 |
| TC-AUTH-05 ✅ | 无 token 访问受保护接口 | code=401 |
| TC-AUTH-06 ✅ | 有 token 但无权限 | code=403 |
| TC-AUTH-07 | 登出后旧 token | code=401 |

### 9.2 用户管理

| ID | 场景 | 预期 |
| --- | --- | --- |
| TC-USER-01 ✅ | 新增用户，用户名重复 | code=422，username 字段错误 |
| TC-USER-02 ✅ | 删除自己 | code=1，拒绝 |
| TC-USER-03 ✅ | 删除超级管理员 | code=1，拒绝（INV-7） |
| TC-USER-04 ✅ | 业务管理员查用户列表 | 仅返回其数据权限范围内（INV 数据权限） |
| TC-USER-05 ✅ | 分配多个角色 | 用户最终权限=角色并集（INV-2） |
| TC-USER-06 | 手机号格式错 | code=422，phone 字段错误 |

### 9.3 角色 / 菜单

| ID | 场景 | 预期 |
| --- | --- | --- |
| TC-ROLE-01 ✅ | 改角色权限后，旧会话用户 | 仍持旧权限，刷新后更新（§8.2） |
| TC-ROLE-02 ✅ | 删除带用户的角色 | 拒绝 或 解绑后删（择一，见 OP-3） |
| TC-MENU-01 ✅ | 菜单 parent 成环 | code=1，拒绝（INV-4） |
| TC-MENU-02 ✅ | 删除有子节点的目录 | 拒绝（INV-5） |
| TC-MENU-03 ✅ | button 类型无 permission | code=422 |

### 9.4 不变量与安全

| ID | 场景 | 预期 |
| --- | --- | --- |
| TC-INV-01 ✅ | 并发新建同 username | 仅一个成功，另一个 422 |
| TC-INV-02 ✅ | 响应中查找 password_hash | 不存在（SEC-8） |
| TC-INV-03 ✅ | 日志中查找明文密码 | 不存在（SEC-8） |
| TC-INV-04 | SQL 注入 payload 入参 | 被参数化化解，无注入（SEC-5） |

---

## 10. 关键设计取舍（评审焦点）

| # | 取舍点 | 选择 | 理由 | 备选 |
| --- | --- | --- | --- | 备选方案 |
| TR-1 | 菜单 vs 权限是否分两类 | **合并（方案 A）** | 菜单与按钮共享树结构与"绑定角色"，配置简单 | 分为 Menu+Permission（DOMAIN_MODEL §3.7） |
| TR-2 | 业务码走 HTTP 200 还是 HTTP 状态码 | **全 200** | 简化前端拦截器，避免网关语义混淆 | RESTful HTTP 状态码 |
| TR-3 | Session 存储 | **Redis 优先，DB 降级** | 通用域可替换，单点不致命 | 纯 DB / 纯 Redis |
| TR-4 | 数据权限作用域 | **仅业务数据** | 配置数据（字典/菜单）全局可见，避免管理员看不到配置 | 全表生效 |
| TR-5 | 用户-角色关联是否带审计属性 | **不带（P0）** | MVP 简化；操作日志已记录变更人 | 升级为关联类带 grantedAt/grantedBy |
| TR-6 | 软删 vs 硬删 | **软删（deleted_at）** | 历史可追溯，外键不破裂 | 硬删 |

---

## 11. 开放问题（Open Questions，需决策）

| ID | 问题 | 影响 | 建议 |
| --- | --- | --- | --- |
| OP-1 | 后端技术栈？NestJS / Spring Boot / Go | `apps/api` 实现；与 shared 衔接成本 | NestJS（同语言，类型共享零成本） |
| OP-2 | 是否多租户（Tenant） | 若是，所有聚合加 tenant_id | MVP 不做 |
| OP-3 | 删除带用户的角色：拒绝 还是 级联解绑 | TC-ROLE-02 行为 | 解绑后删（更友好） |
| OP-4 | 会话/Token 是否外置（Keycloak 等） | Session 是否进核心模型 | 自建（控制权 + 简单） |
| OP-5 | 部门树深度限制 | 决定树存储方案（邻接表/路径/闭包表） | 邻接表 + 递归查询（深度≤5） |

---

## 12. 版本映射（spec ↔ PRD ↔ 交付）

| Spec 章节 | PRD 功能 | 优先级 | 交付里程碑 |
| --- | --- | --- | --- |
| §4.3 鉴权 | F-AUTH-01~04 | P0 | v0.1 MVP |
| §4.4 用户 | F-USER-01~04 | P0 | v0.1 MVP |
| §4.5 角色/菜单 | F-USER-02/03, F-AUTH-05 | P0/P1 | v0.1 / v0.5 |
| §4.5 部门/岗位/字典 | F-USER-05/07/08, F-CONF-02 | P1 | v0.5 |
| §4.6 监控 | F-LOG-01~04 | P1 | v0.5 |
| §5.4 数据权限 | F-USER-06 | P1 | v0.5 |
| §7 SEC-3/9/10 | F-SEC-05 | P1 | v0.5 |
| P2 占位 | SSO / 代码生成 / 定时任务 / 多租户 | P2 | v1.x |

---

## 附录 A：与已有产物的对应关系

| 本 Spec | 对应文档/代码 |
| --- | --- |
| §3 数据模型 | `DOMAIN_MODEL.md §3.5` 领域类图、`packages/shared/src/types.ts` |
| §5.3 不变量 | `DOMAIN_MODEL.md §3.6` 关键不变量 |
| §8 状态机 | `DOMAIN_MODEL.md §4` |
| §9 验收用例 | `PRD.md §7` 验收标准（细化为可测） |
| §4 接口 | `apps/web/lib/api/client.ts`（前端契约一致） |
| §6 前端 | `apps/web/` 已实现原型的行为 |

## 附录 B：变更记录

| 版本 | 日期 | 变更 |
| --- | --- | --- |
| v1.0 | 2026-07-04 | 初版基准，覆盖 P0/P1 接口与规则 |
