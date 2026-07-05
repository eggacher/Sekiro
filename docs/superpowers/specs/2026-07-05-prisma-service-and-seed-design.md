# PrismaService + 完整 Seed 数据设计

> **关联 issue:** [#14 PrismaService 注入层](https://github.com/eggacher/Sekiro/issues/14) · [#13 Seed 数据初始化](https://github.com/eggacher/Sekiro/issues/13) · Story #5 (DB)
> 
> **方法论:** superpowers `brainstorming` skill 驱动
> 
> **状态:** 设计中 → 用户审阅 → writing-plans 出实现计划
> 
> **日期:** 2026-07-05

---

## 1. 目标

### 1.1 PrismaService（#14）

在 NestJS 中封装 PrismaClient，提供：
- 全局单例，避免多次初始化
- 自动的 connection 生命周期管理（应用启动时连接、关闭时断开）
- 后续所有 repository 层都通过注入 PrismaService 访问数据库

### 1.2 Seed 数据（#13）

一次性灌入**完整示例数据**（参照 `apps/web/lib/mock/system.ts` 和 `monitor.ts`），覆盖：
- **12 个用户**（1 个超管 + 11 个普通用户，各有不同角色和部门）
- **7 个角色**（附带精细的菜单权限映射规则）
- **完整菜单树**（3 层：工作台 + 系统管理目录 + 监控目录，含 34 个节点）
- **部门树**（6 层，根是"Sekiro 科技"，下辖 6 个一级部门）
- **6 个岗位**（董事长~实习生）
- **4 个数据字典**（性别、菜单显示状态、系统状态、是否）
- **12 条登录日志**（成功/失败混合）
- **10 条操作日志**（CRUD 操作示例）

一旦 seed 跑通，前端点 login 就能用真实数据测试权限流程。

---

## 2. 关键设计决策

### 2.1 PrismaService 的作用

| 需求 | 方案 | 理由 |
|------|------|------|
| **避免 PrismaClient 多次创建** | NestJS Injectable + Singleton（默认）| 每个 module 只 import 一次，全局共享 |
| **生命周期管理** | 实现 NestJS OnModuleInit / OnModuleDestroy 钩子 | 应用启动时自动连接，关闭时断开 |
| **暴露数据库句柄** | expose 整个 PrismaClient 对象 | 后续 Repository 可以用 `prisma.user.findUnique()` 等 |
| **后续扩展点** | 留钩子，支持日志、事务包装 | P2 增强：每次查询打日志、自动加软删过滤 |

### 2.2 Seed 的实现策略

| 层面 | 决策 | 说明 |
|------|------|------|
| **执行时机** | `prisma db seed`（Prisma 官方 seeding） | 在 `package.json` 的 `prisma.seed` 配置指定 seeder 脚本 |
| **实现语言** | TypeScript + tsx（与 NestJS 一致）| 可直接 import `@sekiro/shared` 的类型 |
| **执行流程** | 清空已有数据（truncate）→ 按依赖顺序逐表 insert | 确保可重复执行，开发时反复 seed 不出错 |
| **超管密码** | 固定 `admin123`（bcrypt hash, cost=10）| 与前端登录页预填一致 |
| **其他用户密码** | 12 位随机字符串，bcrypt hash | 真实环境模拟 |
| **密码在哪看** | Seed 脚本完成后 console.log 所有用户密码 | 测试方便 |

### 2.3 Role → Menu 权限映射规则

所有 `role_menu` 关联表的数据按以下规则生成：

| 角色 ID | 角色名 | 可见菜单 | 可操作按钮 | 说明 |
|--------|--------|---------|----------|------|
| **1** | 超级管理员 | 全部（1, 2, 21-26, 3, 31-34） | 全部（211-213） | 无限权限 |
| **2** | 管理员 | 1, 2, 21-26 | 全部（211-213） | 不含监控 |
| **3** | 财务专员 | 1, 2, 21, 24, 25, 26（仅菜单） | 无 | 只读权限，无按钮 |
| **4** | 运营专员 | 1, 2, 21, 26（仅菜单） | 无 | 只读权限 |
| **5** | 市场专员 | 1, 2, 26（仅菜单） | 无 | 最小权限 |
| **6** | 客服专员 | 1, 3, 31, 32 | 无 | 仅查看在线用户和登录日志 |
| **7** | 开发 | 1, 3, 31-34 | 无 | 监控专用，无管理权限 |

**菜单 ID 说明：**
- `1` = 工作台
- `2` = 系统管理（目录）
  - `21` = 用户管理，`211/212/213` = 新增/编辑/删除按钮
  - `22` = 角色管理
  - `23` = 菜单管理
  - `24` = 部门管理
  - `25` = 岗位管理
  - `26` = 数据字典
- `3` = 系统监控（目录）
  - `31` = 在线用户
  - `32` = 登录日志
  - `33` = 操作日志
  - `34` = 服务监控

### 2.4 用户 → 角色映射（`user_role` 关联表）

12 个用户分配如下：

| 用户 ID | username | 角色列表 | 所属部门 ID |
|--------|----------|---------|-----------|
| **1** | admin | 超级管理员 | 101（研发中心） |
| **2** | zhangsan | 管理员 | 101（研发中心） |
| **3** | lisi | 财务专员 | 102（财务部） |
| **4** | wangwu | 运营专员 | 103（运营部） |
| **5** | zhaoliu | 市场专员 | 104（市场部） |
| **6** | qianqi | 客服专员 | 105（客服部） |
| **7** | sunba | 管理员 + 开发 | 101（研发中心） |
| **8** | zhoujiu | HR（暂时映射为客服专员） | 106（人事部） |
| **9** | wushi | 财务专员 | 102（财务部） |
| **10** | zhengshi | 运营专员 | 103（运营部） |
| **11** | wangshier | 市场专员 | 104（市场部） |
| **12** | liushisan | 客服专员 | 105（客服部） |

### 2.5 用户 → 岗位映射（`user_position` 关联表）

简化规则：
- `admin` (id=1) = 董事长 (position id=1)
- `zhangsan` (id=2) = 项目经理 (2)
- `sunba` (id=7) = 技术总监 (3)
- 其他用户各分配一个岗位（轮流分配 1-5，跳过 6"实习生"）

### 2.6 Role 数据范围（`dataScope`）

| 角色 | dataScope 值 | 说明 |
|------|-------------|------|
| 超级管理员 | `all` | 全部数据 |
| 管理员 | `dept_and_below` | 所在部门及子部门 |
| 财务专员 | `dept` | 仅所在部门 |
| 运营专员 | `dept` | 仅所在部门 |
| 市场专员 | `self` | 仅自己 |
| 客服专员 | `self` | 仅自己 |
| 开发 | `self` | 仅自己 |

---

## 3. 文件结构

### 3.1 新建文件

```
apps/api/
├── src/
│   ├── modules/
│   │   └── prisma/                      # 新增 Prisma 模块
│   │       ├── prisma.service.ts        # PrismaClient 封装
│   │       ├── prisma.module.ts         # NestJS 模块配置
│   │       └── index.ts                 # 导出
│   └── common/
│       └── decorators/
│           └── (后续 P2)                # 自动软删过滤等增强
├── prisma/
│   └── seed.ts                          # Seed 脚本
└── package.json                         # 改：加 prisma.seed 配置
```

### 3.2 改动文件

- `apps/api/package.json`：加 `"prisma": { "seed": "tsx prisma/seed.ts" }`

---

## 4. PrismaService 实现概要

```typescript
// apps/api/src/modules/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

后续各 module 在 controller/service 中注入：

```typescript
constructor(private prisma: PrismaService) {}

// 使用
const user = await this.prisma.user.findUnique({ where: { id: 1 } });
```

---

## 5. Seed 脚本实现概要

```typescript
// apps/api/prisma/seed.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Step 1: 清空所有表（软删 + 关联表）
  // Step 2: 插入 Dept（树）
  // Step 3: 插入 Position
  // Step 4: 插入 DictType + DictItem
  // Step 5: 插入 User（含 bcrypt 密码）
  // Step 6: 插入 Role
  // Step 7: 插入 Menu（树）
  // Step 8: 插入 UserRole（关联）
  // Step 9: 插入 UserPosition（关联）
  // Step 10: 插入 RoleMenu（关联）
  // Step 11: 插入 LoginLog
  // Step 12: 插入 OperationLog
  // Step 13: console.log 所有用户及密码
}

main()
  .then(() => console.log('Seed 完成'))
  .catch(e => { throw e; })
  .finally(() => prisma.$disconnect());
```

---

## 6. 业务规则与不变量

### 6.1 前置约束（INV-7）

- 超管必须 `id=1`，`username="admin"`，`status="enabled"`
- Seed 脚本保证超管账号始终存在，无法通过前端删除

### 6.2 密码安全

- 所有密码：bcrypt, cost ≥ 10（约 100ms/次）
- 密码 hash 永不出现在响应体（controller 层过滤）
- Seed 完成后打印所有账号密码便于测试，**但生产环境不应 commit 这个脚本**

### 6.3 软删与 Seed 可重复性

- Seed 脚本先执行 `deleteMany` 清空各表（包括软删的记录）
- 确保反复 seed 不出错，开发时可随时重置数据库

### 6.4 树的一致性

- 部门树：根节点 `id=100`，其他节点 `parentId` 指向父部门
- 菜单树：根节点无 `parentId`（null），其他节点指向父菜单
- Seed 脚本按依赖顺序（父 → 子）插入，确保外键约束通过

---

## 7. 与现有文档的对应

| 文档 | 对应关系 |
|------|---------|
| `SPEC.md §3` | 数据模型与 Seed 字段一一对应 |
| `DOMAIN_MODEL.md` | 领域概念（User/Role/Menu...）与 seed 数据结构一致 |
| `apps/web/lib/mock/system.ts` | Mock 数据数值基本复用，但存到真实 DB |
| `@sekiro/shared` | 所有 DTO、枚举（CommonStatus、DataScopeType...）从 shared 导入 |

---

## 8. 验收标准

### PrismaService

- [ ] PrismaService 类实现，继承 PrismaClient，实现 OnModuleInit/OnModuleDestroy
- [ ] NestJS Module 配置，导出 PrismaService
- [ ] 应用启动时自动连接 PG，关闭时自动断开（无错误）

### Seed 脚本

- [ ] `prisma/seed.ts` 完整，包含全部 14 张表的数据
- [ ] `pnpm --filter @sekiro/api exec prisma db seed` 执行成功，无报错
- [ ] PG 中数据总数：12 User + 7 Role + 34 Menu + 6 Dept + 6 Position + 4 DictType + 14 DictItem + 12 LoginLog + 10 OperationLog = 105 条
- [ ] 检查关联表：UserRole 16 条、UserPosition 12 条、RoleMenu 96 条、RoleDept（如有）符合规则
- [ ] 超管密码哈希正确（bcrypt verify("admin123", hash) = true）
- [ ] Seed 脚本输出所有用户的明文密码供测试使用
- [ ] 反复执行 seed 不出错

### 集成验证

- [ ] `pnpm --filter @sekiro/api test` 全 PASS（若有 Prisma Service 的测试）
- [ ] 前端登录页用 `admin / admin123` 能成功模拟登录接口调用

---

## 9. 后续衔接

完成本设计后：

1. **writing-plans** 出详细实施计划（Task 拆分、checkpoint）
2. **subagent-driven-development** 并行执行各 Task
3. **实施完成后**：Story #6（Auth 登录接口）可基于此 PrismaService 和 Seed 数据快速开发

---

## 10. 设计假设与未定义项

- ✅ **密码默认值**：超管 `admin123`，其他随机（已定）
- ✅ **菜单权限映射**：7 个角色 × 菜单权限规则（已定）
- ✅ **数据量**：12 用户 + 7 角色 + 完整树（已定）
- ⏳ **bcrypt 库选择**：假设用 `bcrypt` npm 包（详见 writing-plans）
- ⏳ **日志表初值**：直接 insert，无日期滚动、分区逻辑（P2 增强）
- ⏳ **SystemConfig 表**：暂不 seed（留给后续需要时补）

---

**准备就绪，可进行用户审阅！**
