# Prisma Schema 设计(数据库初始化)

> **关联 issue:** [#10 Prisma 初始化与 schema.prisma 起草](https://github.com/eggacher/Sekiro/issues/10) / Story #5 / Epic #1
> **方法论:** superpowers `brainstorming` skill 驱动
> **状态:** 待用户审阅 → 通过后转 `writing-plans` 出实现计划
> **日期:** 2026-07-04

---

## 1. 目标

为 Sekiro 后端(`apps/api`)起草 `schema.prisma`,覆盖 SPEC §3 全部实体,作为 Story #5(数据库初始化)的契约。本设计严格对齐:
- `docs/SPEC.md` §3 数据模型、§5.3 不变量
- `packages/shared/src/types.ts`(前后端类型单一来源)
- `docs/DOMAIN_MODEL.md` §3 领域类

## 2. 关键设计决策

| 决策点 | 选择 | 理由 | 对应 SPEC |
| --- | --- | --- | --- |
| **树存储** | 邻接表 + 递归 CTE | 菜单深度≤4、部门≤5,简单够用;改父子关系只改一个字段 | OP-5 |
| **主键** | 自增整型 | 简单、人友好、索引小;与前端 mock 的数字 id 一致 | — |
| **枚举存储** | 字符串 | 可读性优先;与 `@sekiro/shared` 字面量联合类型零转换 | — |
| **Session 存储** | 仅 Redis,不建 DB 表 | 登录态走 Redis;在线用户查 Redis keys;符合 TR-3 | TR-3 |
| **密码存储** | 仅 `passwordHash`(bcrypt cost≥10) | salt 已内置在 bcrypt;独立 salt 字段冗余且易诱导错误用法 | SEC-1 |
| **软删** | `deletedAt` 字段 | 历史可追溯,外键不破裂 | TR-6 |
| **数据范围自定义部门** | `role_dept` 关联表 | 数据完整性优于 JSON 数组 | — |

### 2.1 关于"password 加 salt"的备忘

> 本节记录 brainstorming 中讨论过的常见误区,避免后续团队成员重复纠结。

**事实:bcmpy 已把 salt 内置。** 一个 bcrypt 哈希 `$2b$10$<22位salt>$<哈希本体>` 中,salt 已编码其中,`bcrypt.compare` 自动提取使用。

- 加独立 `salt` 字段 → 冗余,且诱导"手动拼接 salt 再 hash",反而绕过 bcrypt 安全机制
- 防破解靠 **cost 因子**(≥10,约 100ms/次),未来可调高或升级 argon2
- pepper(服务端密钥,防 DB 单点泄漏)作为 P2 增强,记录在 `docs/BACKLOG.md`

## 3. 表结构

### 3.1 命名约定

- Prisma model 用 **PascalCase**(`User`、`DictItem`)
- 映射到 PG 表用 **snake_case**(`@@map("user")`、`@@map("dict_item")`)
- 字段 camelCase,映射到 PG 列 snake_case(`@map("created_at")`)
- 技术字段(createdAt/updatedAt/deletedAt)每张业务表都有,日志表除外

### 3.2 核心域:组织与权限治理

#### User(用户)

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| id | Int | `@id @default(autoincrement())` | |
| username | String | `@unique`、`@db.VarChar(32)` | `[3-32, ^[a-zA-Z0-9_]+$]` INV-1 |
| passwordHash | String | `@map("password_hash")` | bcrypt cost≥10,永不外露 |
| nickname | String | `@db.VarChar(32)` | |
| email | String? | `@db.VarChar(128)` | email 格式校验在 DTO 层 |
| phone | String? | `@db.VarChar(20)` | 手机号校验在 DTO 层 |
| avatar | String? | `@db.VarChar(512)` | URL |
| deptId | Int? | `@map("dept_id")` FK→Dept | 归属部门 |
| status | String | `@default("enabled")` `@db.VarChar(16)` | enabled/disabled,状态机 §8.1 |
| lockedUntil | DateTime? | `@map("locked_until")` | 失败锁定到期时间(临时态) |
| loginFailCount | Int | `@default(0)` `@map("login_fail_count")` | 失败计数(SEC-3) |
| lastLoginAt | DateTime? | `@map("last_login_at")` | |
| createdAt | DateTime | `@default(now())` `@map("created_at")` | |
| updatedAt | DateTime | `@updatedAt` `@map("updated_at")` | |
| deletedAt | DateTime? | `@map("deleted_at")` | 软删 TR-6 |

索引:`@@unique([username])`(已含软删;Prisma 层查询统一加 `deletedAt IS NULL`)

#### Role(角色)

| 字段 | 类型 | 约束 |
| --- | --- | --- |
| id | Int | 主键自增 |
| name | String | `@unique` `@db.VarChar(32)` |
| code | String | `@unique` `@db.VarChar(64)` `[a-z_]+` |
| description | String? | `@db.VarChar(255)` |
| dataScope | String | `@default("self")` `@map("data_scope")` [all/dept_and_below/dept/self/custom] |
| status | String | `@default("enabled")` |
| createdAt/updatedAt/deletedAt | DateTime | |

#### Menu(菜单/权限节点,方案 A 单一类)

| 字段 | 类型 | 约束 | 说明 |
| --- | --- | --- | --- |
| id | Int | 主键自增 | |
| parentId | Int? | `@map("parent_id")` FK→Menu | 邻接表,可空=根 |
| title | String | `@db.VarChar(32)` | |
| type | String | `@db.VarChar(16)` | directory/menu/button |
| path | String? | `@db.VarChar(128)` | type≠button 必填,以 `/` 开头 |
| component | String? | `@db.VarChar(128)` | type=menu 必填 |
| icon | String? | `@db.VarChar(64)` | lucide 图标名 |
| permission | String? | `@db.VarChar(128)` | type=button 必填,`^[a-z]+:[a-z]+:[a-z]+$` |
| sort | Int | `@default(0)` | |
| visible | Boolean | `@default(true)` | |
| cache | Boolean | `@default(true)` | |
| status | String | `@default("enabled")` | |
| createdAt/updatedAt | DateTime | | 不软删(配置项直接删) |

#### Dept(部门,树形)/ Position(岗位)

| 表 | 关键字段 |
| --- | --- |
| Dept | id, parentId?(FK→Dept), name, leader?, phone?, sort, status, 软删字段 |
| Position | id, name(@unique), code(@unique), sort, status, 软删字段 |

#### 关联表(M:N)

| 表 | 字段 | 主键 |
| --- | --- | --- |
| user_role | userId, roleId | `@@id([userId, roleId])` |
| role_menu | roleId, menuId | `@@id([roleId, menuId])` |
| user_position | userId, positionId | `@@id([userId, positionId])` |
| role_dept | roleId, deptId | `@@id([roleId, deptId])` ← Role.customDeptIds 落地 |

> 关联表不带审计属性(grantedAt/grantedBy),变更由 OperationLog 记录(SPEC TR-5)。

### 3.3 支撑域

#### DictType / DictItem(数据字典)

DictType: `id, name, code(@unique), remark?, status, createdAt/updatedAt/deletedAt`
DictItem:
| 字段 | 约束 |
| --- | --- |
| id | 主键 |
| typeId | FK→DictType |
| label | `@db.VarChar(64)` |
| value | `@db.VarChar(64)` |
| sort | Int |
| status | String |
| **`@@unique([typeId, value])`** | INV-8 |

#### SystemConfig(系统参数)

`key(@unique), value(text), remark?, updatedAt` —— 不软删,配置项直接改/删。

### 3.4 通用域:认证与可观测

#### Session —— **不建表,仅 Redis**

核心会话走 Redis(key=token,value=`{userId, expireTime, ...}`);在线用户(#22)查 Redis keys。不建 DB sessions 表,符合 YAGNI。

#### LoginLog / OperationLog(仅追加)

| 表 | 字段 |
| --- | --- |
| LoginLog | id, username, ip, location?, browser?, os?, result[success/fail], message, createdAt |
| OperationLog | id, operator, module, type[create/update/delete/export/other], description, method, url, ip, cost(ms), status, createdAt |

约束:只 INSERT,禁止 UPDATE/DELETE;不加 updatedAt/deletedAt。后期可按月分区(P2)。

## 4. 不变量守护(schema 层)

| 不变量 | schema 实现 |
| --- | --- |
| INV-1 username 全库唯一 | `@@unique([username])` + Service 双检 |
| INV-4 Menu/Dept 树无环 | 邻接表;写入前应用层环检测(无 DB 层方案) |
| INV-7 超管不可删/停 | 约定 id=1,应用层硬编码保护 |
| INV-8 (typeId, value) 唯一 | `@@unique([typeId, value])` |

## 5. 不在本设计范围

- Prisma 工程化(migrate/dev 命令、PrismaService 封装)→ issue #12、#14
- 种子数据具体内容 → issue #13
- DTO 校验规则(在 service 层,不在 schema)→ 各业务 story
- Redis 客户端封装 → Epic #1 后续 task

## 6. 开放问题

无。所有决策已在 brainstorming 中闭环。

## 7. 后续

通过 `writing-plans` skill 出实现计划,落地到 issue #10 的执行步骤。
