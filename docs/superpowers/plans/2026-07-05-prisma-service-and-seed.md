# PrismaService + Seed 数据实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 PrismaService（NestJS 数据库连接管理）和完整 Seed 数据脚本，为后续所有数据库操作提供基础设施。

**Architecture:** PrismaService 作为全局单例在 NestJS 应用启动时初始化，所有 repository/service 通过依赖注入访问数据库；Seed 脚本按依赖顺序（Dept → User → Role → Menu → 关联表）逐表插入 105+ 示例数据，支持重复执行。

**Tech Stack:** NestJS、Prisma 5.x、bcrypt、TypeScript、PostgreSQL、tsx

## Global Constraints

- 工作目录：`<PROJECT_ROOT>`，所有 pnpm 命令在根执行
- pnpm workspace，子包用 `pnpm --filter @sekiro/api <cmd>`
- TypeScript strict 模式（继承 `tsconfig.base.json`）
- 所有密码用 bcrypt hash，cost ≥ 10
- Seed 脚本可重复执行（先清空再插入）
- 超管 `id=1`，密码固定 `admin123`，其他用户密码随机生成

---

## 文件结构

| 文件路径 | 职责 | 创建/改动 |
|---------|------|---------|
| `apps/api/src/modules/prisma/prisma.service.ts` | PrismaClient 封装，实现生命周期管理 | 创建 |
| `apps/api/src/modules/prisma/prisma.module.ts` | NestJS 模块配置，提供 PrismaService | 创建 |
| `apps/api/src/modules/prisma/index.ts` | 导出 PrismaService 和 PrismaModule | 创建 |
| `apps/api/prisma/seed.ts` | Seed 脚本，插入全部示例数据 | 创建 |
| `apps/api/package.json` | 加 prisma.seed 配置 + bcrypt 依赖 | 改动 |

---

## Task 1: PrismaService 实现

**Files:**
- Create: `apps/api/src/modules/prisma/prisma.service.ts`
- Create: `apps/api/src/modules/prisma/prisma.module.ts`
- Create: `apps/api/src/modules/prisma/index.ts`

**Interfaces:**
- Produces: `PrismaService` 类（继承 `PrismaClient`，实现 `OnModuleInit` / `OnModuleDestroy`）和 `PrismaModule`（NestJS module）

---

### Step 1: 创建 prisma.service.ts

- [ ] 创建文件 `apps/api/src/modules/prisma/prisma.service.ts`

```typescript
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

**说明：**
- `PrismaService` 继承 `PrismaClient`，自动获得所有 ORM 方法（`user.findUnique()` 等）
- `onModuleInit` 在应用启动时调用，自动连接 PG
- `onModuleDestroy` 在应用关闭时调用，自动断开连接

---

### Step 2: 创建 prisma.module.ts

- [ ] 创建文件 `apps/api/src/modules/prisma/prisma.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

**说明：**
- 模块声明 `PrismaService` 为 provider 并导出，其他 module 可以 `import PrismaModule` 后注入使用

---

### Step 3: 创建导出文件 index.ts

- [ ] 创建文件 `apps/api/src/modules/prisma/index.ts`

```typescript
export { PrismaService } from './prisma.service';
export { PrismaModule } from './prisma.module';
```

---

### Step 4: 验证模块可加载

- [ ] 运行 TypeScript 类型检查

```bash
pnpm --filter @sekiro/api typecheck
```

Expected: 通过，无 TS 错误

---

### Step 5: Commit Task 1

- [ ] 提交 PrismaService 模块

```bash
cd <PROJECT_ROOT>
git add apps/api/src/modules/prisma/
git commit -m "feat(api): PrismaService NestJS 模块实现

- 实现 PrismaService 类，继承 PrismaClient
- 自动管理数据库连接生命周期（onModuleInit/onModuleDestroy）
- 导出 PrismaModule 供其他模块注入"
```

---

## Task 2: Seed 脚本基础与密码生成

**Files:**
- Create: `apps/api/prisma/seed.ts`
- Modify: `apps/api/package.json` (add bcrypt dependency + prisma.seed)

**Interfaces:**
- Produces: Seed 脚本的基础框架和密码工具函数

---

### Step 1: 加 bcrypt 依赖

- [ ] 安装 bcrypt 包

```bash
pnpm --filter @sekiro/api add bcrypt
pnpm --filter @sekiro/api add -D @types/bcrypt
```

Expected: `apps/api/node_modules/bcrypt` 存在，无错误

---

### Step 2: 更新 package.json 加 prisma.seed 配置

- [ ] 打开 `apps/api/package.json`，在根对象（与 `dependencies` 同级）加：

```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

完整示例（仅展示相关部分）：
```json
{
  "name": "@sekiro/api",
  "version": "0.1.0",
  "private": true,
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
  "scripts": {
    "dev": "tsx watch src/main.ts",
    ...
  },
  ...
}
```

---

### Step 3: 创建 seed.ts 框架

- [ ] 创建文件 `apps/api/prisma/seed.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * 生成密码哈希
 * @param password 明文密码
 * @param cost bcrypt cost 因子，默认 10
 */
async function hashPassword(password: string, cost = 10): Promise<string> {
  return bcrypt.hash(password, cost);
}

/**
 * 生成随机密码（12位）
 */
function generateRandomPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

async function main() {
  console.log('🌱 开始种子数据导入...');

  try {
    // TODO: Step 1 清空表
    // TODO: Step 2 插入 Dept（部门树）
    // TODO: Step 3 插入 Position（岗位）
    // TODO: Step 4 插入 DictType + DictItem（字典）
    // TODO: Step 5 插入 User（用户）
    // TODO: Step 6 插入 Role（角色）
    // TODO: Step 7 插入 Menu（菜单树）
    // TODO: Step 8 插入 UserRole（用户-角色关联）
    // TODO: Step 9 插入 UserPosition（用户-岗位关联）
    // TODO: Step 10 插入 RoleMenu（角色-菜单关联）
    // TODO: Step 11 插入 LoginLog（登录日志）
    // TODO: Step 12 插入 OperationLog（操作日志）

    console.log('✅ 种子数据导入完成');
  } catch (error) {
    console.error('❌ 导入失败:', error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**说明：**
- `hashPassword()` 用 bcrypt 生成密码哈希，cost=10
- `generateRandomPassword()` 生成 12 位随机密码（超管除外）
- 主流程框架，各步骤用 TODO 占位

---

### Step 4: 验证脚本框架可执行

- [ ] 运行 TypeScript 检查

```bash
pnpm --filter @sekiro/api typecheck
```

Expected: 通过，无错误

---

### Step 5: Commit Task 2

- [ ] 提交 Seed 脚本框架和依赖

```bash
cd <PROJECT_ROOT>
git add apps/api/package.json apps/api/prisma/seed.ts
git commit -m "feat(api): Seed 脚本框架 + bcrypt 依赖

- 添加 bcrypt 包用于密码哈希（cost=10）
- 创建 seed.ts 主框架
- 实现 hashPassword() 和 generateRandomPassword() 工具函数
- 配置 prisma.seed 为 'tsx prisma/seed.ts'"
```

---

## Task 3: 完整 Seed 数据填充

**Files:**
- Modify: `apps/api/prisma/seed.ts` (fill in all data)

**Interfaces:**
- Consumes: 设计文档中的完整数据规格（12 用户、7 角色、34 菜单等）
- Produces: 可执行的 seed 脚本，能将 105+ 示例数据插入 PG

---

### Step 1: 在 seed.ts 中定义数据常量

- [ ] 在 `main()` 函数**前**，加入以下数据定义：

```typescript
// ============ 数据常量定义 ============

// 1. 部门数据
const deptData = [
  {
    id: 100,
    name: 'Sekiro 科技',
    leader: '创始人',
    phone: '13800000000',
    sort: 1,
    status: 'enabled' as const,
    parentId: null,
  },
  {
    id: 101,
    name: '研发中心',
    leader: '张三',
    phone: '13800138001',
    sort: 1,
    status: 'enabled' as const,
    parentId: 100,
  },
  {
    id: 1011,
    name: '前端组',
    leader: '孙八',
    phone: '13800138006',
    sort: 1,
    status: 'enabled' as const,
    parentId: 101,
  },
  {
    id: 1012,
    name: '后端组',
    leader: '周九',
    phone: '13800138007',
    sort: 2,
    status: 'enabled' as const,
    parentId: 101,
  },
  {
    id: 1013,
    name: '测试组',
    leader: '吴十',
    phone: '13800138008',
    sort: 3,
    status: 'enabled' as const,
    parentId: 101,
  },
  {
    id: 102,
    name: '财务部',
    leader: '李四',
    phone: '13800138002',
    sort: 2,
    status: 'enabled' as const,
    parentId: 100,
  },
  {
    id: 103,
    name: '运营部',
    leader: '王五',
    phone: '13800138003',
    sort: 3,
    status: 'enabled' as const,
    parentId: 100,
  },
  {
    id: 104,
    name: '市场部',
    leader: '赵六',
    phone: '13800138004',
    sort: 4,
    status: 'enabled' as const,
    parentId: 100,
  },
  {
    id: 105,
    name: '客服部',
    leader: '钱七',
    phone: '13800138005',
    sort: 5,
    status: 'enabled' as const,
    parentId: 100,
  },
  {
    id: 106,
    name: '人事部',
    leader: '周九',
    phone: '13800138007',
    sort: 6,
    status: 'enabled' as const,
    parentId: 100,
  },
];

// 2. 岗位数据
const positionData = [
  { id: 1, name: '董事长', code: 'ceo', sort: 1, status: 'enabled' as const },
  { id: 2, name: '项目经理', code: 'pm', sort: 2, status: 'enabled' as const },
  { id: 3, name: '技术总监', code: 'cto', sort: 3, status: 'enabled' as const },
  { id: 4, name: '高级工程师', code: 'senior_dev', sort: 4, status: 'enabled' as const },
  { id: 5, name: '工程师', code: 'dev', sort: 5, status: 'enabled' as const },
  { id: 6, name: '实习生', code: 'intern', sort: 6, status: 'disabled' as const },
];

// 3. 数据字典
const dictTypeData = [
  { id: 1, name: '用户性别', code: 'sys_user_sex', status: 'enabled' as const, remark: '用户性别字典' },
  { id: 2, name: '菜单状态', code: 'sys_show_hide', status: 'enabled' as const, remark: '菜单显示状态' },
  { id: 3, name: '系统状态', code: 'sys_normal_disable', status: 'enabled' as const, remark: '通用启用/停用' },
  { id: 4, name: '是否', code: 'sys_yes_no', status: 'enabled' as const, remark: '是否类字典' },
];

const dictItemData = [
  // sys_user_sex
  { id: 1, typeId: 1, label: '男', value: '0', sort: 1, status: 'enabled' as const },
  { id: 2, typeId: 1, label: '女', value: '1', sort: 2, status: 'enabled' as const },
  { id: 3, typeId: 1, label: '未知', value: '2', sort: 3, status: 'enabled' as const },
  // sys_show_hide
  { id: 4, typeId: 2, label: '显示', value: '0', sort: 1, status: 'enabled' as const },
  { id: 5, typeId: 2, label: '隐藏', value: '1', sort: 2, status: 'enabled' as const },
  // sys_normal_disable
  { id: 6, typeId: 3, label: '启用', value: '0', sort: 1, status: 'enabled' as const },
  { id: 7, typeId: 3, label: '停用', value: '1', sort: 2, status: 'enabled' as const },
  // sys_yes_no
  { id: 8, typeId: 4, label: '是', value: 'Y', sort: 1, status: 'enabled' as const },
  { id: 9, typeId: 4, label: '否', value: 'N', sort: 2, status: 'enabled' as const },
];

// 4. 菜单树数据
const menuData = [
  {
    id: 1,
    title: '工作台',
    type: 'menu' as const,
    path: '/',
    icon: 'LayoutDashboard',
    sort: 1,
    status: 'enabled' as const,
    parentId: null,
  },
  {
    id: 2,
    title: '系统管理',
    type: 'directory' as const,
    icon: 'Settings',
    sort: 2,
    status: 'enabled' as const,
    parentId: null,
  },
  {
    id: 21,
    title: '用户管理',
    type: 'menu' as const,
    path: '/system/user',
    icon: 'Users',
    sort: 1,
    status: 'enabled' as const,
    parentId: 2,
  },
  {
    id: 211,
    title: '新增',
    type: 'button' as const,
    permission: 'system:user:create',
    sort: 1,
    status: 'enabled' as const,
    parentId: 21,
  },
  {
    id: 212,
    title: '编辑',
    type: 'button' as const,
    permission: 'system:user:update',
    sort: 2,
    status: 'enabled' as const,
    parentId: 21,
  },
  {
    id: 213,
    title: '删除',
    type: 'button' as const,
    permission: 'system:user:delete',
    sort: 3,
    status: 'enabled' as const,
    parentId: 21,
  },
  {
    id: 22,
    title: '角色管理',
    type: 'menu' as const,
    path: '/system/role',
    icon: 'ShieldCheck',
    sort: 2,
    status: 'enabled' as const,
    parentId: 2,
  },
  {
    id: 23,
    title: '菜单管理',
    type: 'menu' as const,
    path: '/system/menu',
    icon: 'Menu',
    sort: 3,
    status: 'enabled' as const,
    parentId: 2,
  },
  {
    id: 24,
    title: '部门管理',
    type: 'menu' as const,
    path: '/system/dept',
    icon: 'Building2',
    sort: 4,
    status: 'enabled' as const,
    parentId: 2,
  },
  {
    id: 25,
    title: '岗位管理',
    type: 'menu' as const,
    path: '/system/position',
    icon: 'Briefcase',
    sort: 5,
    status: 'enabled' as const,
    parentId: 2,
  },
  {
    id: 26,
    title: '数据字典',
    type: 'menu' as const,
    path: '/system/dict',
    icon: 'BookMarked',
    sort: 6,
    status: 'enabled' as const,
    parentId: 2,
  },
  {
    id: 3,
    title: '系统监控',
    type: 'directory' as const,
    icon: 'MonitorDot',
    sort: 3,
    status: 'enabled' as const,
    parentId: null,
  },
  {
    id: 31,
    title: '在线用户',
    type: 'menu' as const,
    path: '/monitor/online',
    icon: 'Users',
    sort: 1,
    status: 'enabled' as const,
    parentId: 3,
  },
  {
    id: 32,
    title: '登录日志',
    type: 'menu' as const,
    path: '/monitor/login-log',
    icon: 'LogIn',
    sort: 2,
    status: 'enabled' as const,
    parentId: 3,
  },
  {
    id: 33,
    title: '操作日志',
    type: 'menu' as const,
    path: '/monitor/operation-log',
    icon: 'FileClock',
    sort: 3,
    status: 'enabled' as const,
    parentId: 3,
  },
  {
    id: 34,
    title: '服务监控',
    type: 'menu' as const,
    path: '/monitor/server',
    icon: 'ServerCog',
    sort: 4,
    status: 'enabled' as const,
    parentId: 3,
  },
];

// 5. 角色数据
const roleData = [
  {
    id: 1,
    name: '超级管理员',
    code: 'super_admin',
    description: '拥有系统全部权限',
    dataScope: 'all' as const,
    status: 'enabled' as const,
  },
  {
    id: 2,
    name: '管理员',
    code: 'admin',
    description: '业务管理员，可管理用户与配置',
    dataScope: 'dept_and_below' as const,
    status: 'enabled' as const,
  },
  {
    id: 3,
    name: '财务专员',
    code: 'finance',
    description: '财务相关业务',
    dataScope: 'dept' as const,
    status: 'enabled' as const,
  },
  {
    id: 4,
    name: '运营专员',
    code: 'operation',
    description: '运营相关业务',
    dataScope: 'dept' as const,
    status: 'enabled' as const,
  },
  {
    id: 5,
    name: '市场专员',
    code: 'marketing',
    description: '市场推广业务',
    dataScope: 'self' as const,
    status: 'enabled' as const,
  },
  {
    id: 6,
    name: '客服专员',
    code: 'service',
    description: '客户服务',
    dataScope: 'self' as const,
    status: 'enabled' as const,
  },
  {
    id: 7,
    name: '开发',
    code: 'developer',
    description: '开发人员只读权限',
    dataScope: 'self' as const,
    status: 'disabled' as const,
  },
];

// 6. 用户数据（密码稍后生成）
const userData = [
  { id: 1, username: 'admin', nickname: '超级管理员', email: 'admin@sekiro.com', phone: '13800138000', deptId: 101, status: 'enabled' as const },
  { id: 2, username: 'zhangsan', nickname: '张三', email: 'zhangsan@sekiro.com', phone: '13800138001', deptId: 101, status: 'enabled' as const },
  { id: 3, username: 'lisi', nickname: '李四', email: 'lisi@sekiro.com', phone: '13800138002', deptId: 102, status: 'enabled' as const },
  { id: 4, username: 'wangwu', nickname: '王五', email: 'wangwu@sekiro.com', phone: '13800138003', deptId: 103, status: 'enabled' as const },
  { id: 5, username: 'zhaoliu', nickname: '赵六', email: 'zhaoliu@sekiro.com', phone: '13800138004', deptId: 104, status: 'disabled' as const },
  { id: 6, username: 'qianqi', nickname: '钱七', email: 'qianqi@sekiro.com', phone: '13800138005', deptId: 105, status: 'enabled' as const },
  { id: 7, username: 'sunba', nickname: '孙八', email: 'sunba@sekiro.com', phone: '13800138006', deptId: 101, status: 'enabled' as const },
  { id: 8, username: 'zhoujiu', nickname: '周九', email: 'zhoujiu@sekiro.com', phone: '13800138007', deptId: 106, status: 'enabled' as const },
  { id: 9, username: 'wushi', nickname: '吴十', email: 'wushi@sekiro.com', phone: '13800138008', deptId: 102, status: 'disabled' as const },
  { id: 10, username: 'zhengshi', nickname: '郑十一', email: 'zhengshi@sekiro.com', phone: '13800138009', deptId: 103, status: 'enabled' as const },
  { id: 11, username: 'wangshier', nickname: '王十二', email: 'wang12@sekiro.com', phone: '13800138010', deptId: 104, status: 'enabled' as const },
  { id: 12, username: 'liushisan', nickname: '刘十三', email: 'liu13@sekiro.com', phone: '13800138011', deptId: 105, status: 'enabled' as const },
];

// 7. 登录日志
const loginLogData = [
  { id: 1, username: 'admin', ip: '192.168.1.100', location: '内网', browser: 'Chrome 126', os: 'macOS', result: 'success' as const, message: '登录成功', time: new Date('2026-07-04T09:12:33') },
  { id: 2, username: 'zhangsan', ip: '10.0.12.45', location: '北京', browser: 'Chrome 125', os: 'Windows 11', result: 'success' as const, message: '登录成功', time: new Date('2026-07-04T08:45:21') },
  { id: 3, username: 'lisi', ip: '114.114.211.18', location: '上海', browser: 'Safari 17', os: 'macOS', result: 'success' as const, message: '登录成功', time: new Date('2026-07-04T09:01:14') },
  { id: 4, username: 'unknown', ip: '45.33.21.5', location: '海外', browser: 'Chrome', os: 'Unknown', result: 'fail' as const, message: '用户名或密码错误', time: new Date('2026-07-04T08:30:11') },
  { id: 5, username: 'qianqi', ip: '120.78.45.223', location: '杭州', browser: 'Edge 126', os: 'Windows 10', result: 'success' as const, message: '登录成功', time: new Date('2026-07-04T07:55:30') },
  { id: 6, username: 'admin', ip: '192.168.1.100', location: '内网', browser: 'Chrome 126', os: 'macOS', result: 'fail' as const, message: '验证码错误', time: new Date('2026-07-04T07:50:01') },
  { id: 7, username: 'wangwu', ip: '10.0.12.50', location: '深圳', browser: 'Chrome 124', os: 'Windows 11', result: 'success' as const, message: '登录成功', time: new Date('2026-07-03T22:18:00') },
  { id: 8, username: 'unknown', ip: '193.27.14.88', location: '海外', browser: 'curl', os: 'Unknown', result: 'fail' as const, message: '账号不存在', time: new Date('2026-07-03T21:45:33') },
  { id: 9, username: 'sunba', ip: '192.168.2.91', location: '内网', browser: 'Firefox 127', os: 'Ubuntu', result: 'success' as const, message: '登录成功', time: new Date('2026-07-03T18:33:11') },
  { id: 10, username: 'zhengshi', ip: '10.0.13.7', location: '广州', browser: 'Chrome 125', os: 'Windows 10', result: 'success' as const, message: '登录成功', time: new Date('2026-07-03T20:33:50') },
  { id: 11, username: 'admin', ip: '192.168.1.100', location: '内网', browser: 'Chrome 126', os: 'macOS', result: 'success' as const, message: '退出成功', time: new Date('2026-07-03T17:00:00') },
  { id: 12, username: 'lisi', ip: '114.114.211.18', location: '上海', browser: 'Safari 17', os: 'macOS', result: 'success' as const, message: '登录成功', time: new Date('2026-07-03T14:22:08') },
];

// 8. 操作日志
const operationLogData = [
  { id: 1, operator: 'admin', module: '用户管理', type: 'create' as const, description: '新增用户：liushisan', method: 'POST', url: '/api/system/user', ip: '192.168.1.100', cost: 86, status: 'success' as const, time: new Date('2026-07-04T09:30:11') },
  { id: 2, operator: 'zhangsan', module: '角色管理', type: 'update' as const, description: '修改角色权限：管理员', method: 'PUT', url: '/api/system/role/2/permission', ip: '10.0.12.45', cost: 124, status: 'success' as const, time: new Date('2026-07-04T09:25:45') },
  { id: 3, operator: 'admin', module: '菜单管理', type: 'create' as const, description: '新增菜单：通知中心', method: 'POST', url: '/api/system/menu', ip: '192.168.1.100', cost: 65, status: 'success' as const, time: new Date('2026-07-04T09:18:33') },
  { id: 4, operator: 'lisi', module: '用户管理', type: 'export' as const, description: '导出用户列表', method: 'GET', url: '/api/system/user/export', ip: '114.114.211.18', cost: 1450, status: 'success' as const, time: new Date('2026-07-04T09:05:22') },
  { id: 5, operator: 'admin', module: '部门管理', type: 'delete' as const, description: '删除部门：测试组', method: 'DELETE', url: '/api/system/dept/1013', ip: '192.168.1.100', cost: 92, status: 'success' as const, time: new Date('2026-07-04T08:50:11') },
  { id: 6, operator: 'wangwu', module: '字典管理', type: 'update' as const, description: '修改字典项：用户性别', method: 'PUT', url: '/api/system/dict/item', ip: '10.0.12.50', cost: 78, status: 'success' as const, time: new Date('2026-07-04T08:33:00') },
  { id: 7, operator: 'zhangsan', module: '用户管理', type: 'update' as const, description: '停用账号：zhaoliu', method: 'PUT', url: '/api/system/user/5/status', ip: '10.0.12.45', cost: 56, status: 'success' as const, time: new Date('2026-07-04T08:12:18') },
  { id: 8, operator: 'admin', module: '系统配置', type: 'update' as const, description: '修改站点名称', method: 'PUT', url: '/api/system/config', ip: '192.168.1.100', cost: 110, status: 'fail' as const, time: new Date('2026-07-04T07:45:30') },
  { id: 9, operator: 'lisi', module: '角色管理', type: 'create' as const, description: '新增角色：审计员', method: 'POST', url: '/api/system/role', ip: '114.114.211.18', cost: 134, status: 'success' as const, time: new Date('2026-07-03T22:01:55') },
  { id: 10, operator: 'admin', module: '用户管理', type: 'delete' as const, description: '删除用户：test_account', method: 'DELETE', url: '/api/system/user/99', ip: '192.168.1.100', cost: 70, status: 'success' as const, time: new Date('2026-07-03T21:30:00') },
];
```

**说明：**
- 部门、岗位、字典、菜单、角色、用户、日志数据参照设计文档定义
- 所有 enum 值用 `as const` 类型安全

---

### Step 2: 实现 seed main() 函数

- [ ] 将 `main()` 函数替换为完整实现：

```typescript
async function main() {
  console.log('🌱 开始种子数据导入...\n');

  try {
    // Step 1: 清空所有表（注意依赖顺序：先删关联表，再删主表）
    console.log('📦 Step 1: 清空数据...');
    await prisma.operationLog.deleteMany({});
    await prisma.loginLog.deleteMany({});
    await prisma.roleMenu.deleteMany({});
    await prisma.roleDept.deleteMany({});
    await prisma.userPosition.deleteMany({});
    await prisma.userRole.deleteMany({});
    await prisma.dictItem.deleteMany({});
    await prisma.dictType.deleteMany({});
    await prisma.menu.deleteMany({});
    await prisma.role.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.position.deleteMany({});
    await prisma.dept.deleteMany({});
    console.log('  ✅ 清空完成\n');

    // Step 2: 插入部门树
    console.log('📦 Step 2: 插入部门...');
    for (const dept of deptData) {
      await prisma.dept.create({
        data: {
          id: dept.id,
          name: dept.name,
          leader: dept.leader,
          phone: dept.phone,
          sort: dept.sort,
          status: dept.status,
          parentId: dept.parentId,
        },
      });
    }
    console.log('  ✅ 部门插入完成（共 10 条）\n');

    // Step 3: 插入岗位
    console.log('📦 Step 3: 插入岗位...');
    for (const position of positionData) {
      await prisma.position.create({
        data: {
          id: position.id,
          name: position.name,
          code: position.code,
          sort: position.sort,
          status: position.status,
        },
      });
    }
    console.log('  ✅ 岗位插入完成（共 6 条）\n');

    // Step 4: 插入数据字典
    console.log('📦 Step 4: 插入数据字典...');
    for (const dictType of dictTypeData) {
      await prisma.dictType.create({
        data: {
          id: dictType.id,
          name: dictType.name,
          code: dictType.code,
          status: dictType.status,
          remark: dictType.remark,
        },
      });
    }
    for (const dictItem of dictItemData) {
      await prisma.dictItem.create({
        data: {
          id: dictItem.id,
          typeId: dictItem.typeId,
          label: dictItem.label,
          value: dictItem.value,
          sort: dictItem.sort,
          status: dictItem.status,
        },
      });
    }
    console.log('  ✅ 字典插入完成（4 种类型，9 项）\n');

    // Step 5: 插入用户（含密码哈希）
    console.log('📦 Step 5: 插入用户...');
    const userPasswords: Record<string, string> = {}; // 记录密码供后续输出
    for (let i = 0; i < userData.length; i++) {
      const user = userData[i];
      // 超管用固定密码，其他用随机
      const password = user.id === 1 ? 'admin123' : generateRandomPassword();
      const passwordHash = await hashPassword(password);
      userPasswords[user.username] = password;

      await prisma.user.create({
        data: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          email: user.email,
          phone: user.phone,
          deptId: user.deptId,
          status: user.status,
          passwordHash: passwordHash,
        },
      });
    }
    console.log('  ✅ 用户插入完成（共 12 条）\n');

    // Step 6: 插入角色
    console.log('📦 Step 6: 插入角色...');
    for (const role of roleData) {
      await prisma.role.create({
        data: {
          id: role.id,
          name: role.name,
          code: role.code,
          description: role.description,
          dataScope: role.dataScope,
          status: role.status,
        },
      });
    }
    console.log('  ✅ 角色插入完成（共 7 条）\n');

    // Step 7: 插入菜单树
    console.log('📦 Step 7: 插入菜单...');
    for (const menu of menuData) {
      await prisma.menu.create({
        data: {
          id: menu.id,
          title: menu.title,
          type: menu.type,
          path: menu.path || null,
          icon: menu.icon || null,
          permission: menu.permission || null,
          sort: menu.sort,
          status: menu.status,
          parentId: menu.parentId,
          visible: true,
          cache: true,
        },
      });
    }
    console.log('  ✅ 菜单插入完成（共 16 条，含按钮）\n');

    // Step 8: 插入用户-角色关联（UserRole）
    console.log('📦 Step 8: 插入用户-角色关联...');
    const userRoleMappings = [
      { userId: 1, roleIds: [1] }, // admin = 超级管理员
      { userId: 2, roleIds: [2] }, // zhangsan = 管理员
      { userId: 3, roleIds: [3] }, // lisi = 财务专员
      { userId: 4, roleIds: [4] }, // wangwu = 运营专员
      { userId: 5, roleIds: [5] }, // zhaoliu = 市场专员
      { userId: 6, roleIds: [6] }, // qianqi = 客服专员
      { userId: 7, roleIds: [2, 7] }, // sunba = 管理员 + 开发
      { userId: 8, roleIds: [6] }, // zhoujiu = 客服专员（代理 HR）
      { userId: 9, roleIds: [3] }, // wushi = 财务专员
      { userId: 10, roleIds: [4] }, // zhengshi = 运营专员
      { userId: 11, roleIds: [5] }, // wangshier = 市场专员
      { userId: 12, roleIds: [6] }, // liushisan = 客服专员
    ];
    let userRoleCount = 0;
    for (const mapping of userRoleMappings) {
      for (const roleId of mapping.roleIds) {
        await prisma.userRole.create({
          data: { userId: mapping.userId, roleId },
        });
        userRoleCount++;
      }
    }
    console.log(`  ✅ 用户-角色关联完成（共 ${userRoleCount} 条）\n`);

    // Step 9: 插入用户-岗位关联（UserPosition）
    console.log('📦 Step 9: 插入用户-岗位关联...');
    const userPositionMappings = [
      { userId: 1, positionId: 1 }, // admin = 董事长
      { userId: 2, positionId: 2 }, // zhangsan = 项目经理
      { userId: 7, positionId: 3 }, // sunba = 技术总监
      // 其他用户轮流分配 1-5（跳过 6"实习生"）
      { userId: 3, positionId: 4 }, // lisi
      { userId: 4, positionId: 5 }, // wangwu
      { userId: 5, positionId: 1 }, // zhaoliu
      { userId: 6, positionId: 2 }, // qianqi
      { userId: 8, positionId: 3 }, // zhoujiu
      { userId: 9, positionId: 4 }, // wushi
      { userId: 10, positionId: 5 }, // zhengshi
      { userId: 11, positionId: 1 }, // wangshier
      { userId: 12, positionId: 2 }, // liushisan
    ];
    for (const mapping of userPositionMappings) {
      await prisma.userPosition.create({
        data: { userId: mapping.userId, positionId: mapping.positionId },
      });
    }
    console.log(`  ✅ 用户-岗位关联完成（共 ${userPositionMappings.length} 条）\n`);

    // Step 10: 插入角色-菜单关联（RoleMenu）
    console.log('📦 Step 10: 插入角色-菜单权限...');
    const roleMenuMappings = {
      1: [1, 2, 21, 211, 212, 213, 22, 23, 24, 25, 26, 3, 31, 32, 33, 34], // 超级管理员 = 全部
      2: [1, 2, 21, 211, 212, 213, 22, 23, 24, 25, 26], // 管理员 = 系统管理全部
      3: [1, 2, 21, 24, 25, 26], // 财务专员 = 工作台 + 用户/部门/岗位/字典
      4: [1, 2, 21, 26], // 运营专员 = 工作台 + 用户/字典
      5: [1, 2, 26], // 市场专员 = 工作台 + 字典
      6: [1, 3, 31, 32], // 客服专员 = 工作台 + 在线用户/登录日志
      7: [1, 3, 31, 32, 33, 34], // 开发 = 工作台 + 全部监控
    };
    let roleMenuCount = 0;
    for (const [roleId, menuIds] of Object.entries(roleMenuMappings)) {
      for (const menuId of menuIds) {
        await prisma.roleMenu.create({
          data: { roleId: parseInt(roleId), menuId },
        });
        roleMenuCount++;
      }
    }
    console.log(`  ✅ 角色-菜单权限完成（共 ${roleMenuCount} 条）\n`);

    // Step 11: 插入登录日志
    console.log('📦 Step 11: 插入登录日志...');
    for (const log of loginLogData) {
      await prisma.loginLog.create({
        data: {
          id: log.id,
          username: log.username,
          ip: log.ip,
          location: log.location,
          browser: log.browser,
          os: log.os,
          result: log.result,
          message: log.message,
          time: log.time,
        },
      });
    }
    console.log('  ✅ 登录日志插入完成（共 12 条）\n');

    // Step 12: 插入操作日志
    console.log('📦 Step 12: 插入操作日志...');
    for (const log of operationLogData) {
      await prisma.operationLog.create({
        data: {
          id: log.id,
          operator: log.operator,
          module: log.module,
          type: log.type,
          description: log.description,
          method: log.method,
          url: log.url,
          ip: log.ip,
          cost: log.cost,
          status: log.status,
          time: log.time,
        },
      });
    }
    console.log('  ✅ 操作日志插入完成（共 10 条）\n');

    // 完成统计
    console.log('═════════════════════════════════════════════');
    console.log('✅ 种子数据导入全部完成！');
    console.log('═════════════════════════════════════════════\n');
    console.log('📊 数据统计：');
    console.log('  - 部门：10 条');
    console.log('  - 岗位：6 条');
    console.log('  - 字典类型：4 种（9 项）');
    console.log('  - 用户：12 条');
    console.log('  - 角色：7 条');
    console.log('  - 菜单：16 条（含按钮）');
    console.log(`  - 用户-角色：${userRoleCount} 条`);
    console.log(`  - 用户-岗位：${userPositionMappings.length} 条`);
    console.log(`  - 角色-菜单：${roleMenuCount} 条`);
    console.log('  - 登录日志：12 条');
    console.log('  - 操作日志：10 条');
    console.log('\n🔑 测试账号密码（仅用于开发，生产环境不应留此脚本）：\n');
    console.log('┌─────────────────┬──────────────────────┐');
    console.log('│ username        │ password             │');
    console.log('├─────────────────┼──────────────────────┤');
    for (const [username, password] of Object.entries(userPasswords)) {
      console.log(`│ ${username.padEnd(15)} │ ${password.padEnd(20)} │`);
    }
    console.log('└─────────────────┴──────────────────────┘\n');
    console.log('💡 快速测试：用 admin / admin123 登录\n');
  } catch (error) {
    console.error('❌ 导入失败:', error);
    throw error;
  }
}
```

**说明：**
- 按依赖顺序逐表 insert：部门 → 岗位 → 字典 → 用户 → 角色 → 菜单 → 关联表 → 日志
- 记录所有用户密码，最后输出表格形式供测试使用
- 打印完整的数据统计和快速测试指南

---

### Step 3: 验证 seed 脚本可执行

- [ ] 运行 TypeScript 检查

```bash
pnpm --filter @sekiro/api typecheck
```

Expected: 通过，无 TS 错误

---

### Step 4: 执行 seed 脚本测试

- [ ] 运行 seed 脚本

```bash
pnpm --filter @sekiro/api exec prisma db seed
```

Expected: 输出：
```
🌱 开始种子数据导入...

📦 Step 1: 清空数据...
  ✅ 清空完成

📦 Step 2: 插入部门...
  ✅ 部门插入完成（共 10 条）
...
✅ 种子数据导入全部完成！

📊 数据统计：
...

🔑 测试账号密码...
│ admin           │ admin123             │
│ zhangsan        │ <随机密码>          │
...
```

无错误，所有数据插入成功

---

### Step 5: 验证数据库内容

- [ ] 用 prisma studio 查看数据

```bash
pnpm --filter @sekiro/api exec prisma studio
```

Expected: 浏览器打开 `http://localhost:5555`，能看到：
- User 表：12 行
- Role 表：7 行
- Menu 表：16 行
- Dept 表：10 行
- Position 表：6 行
- DictType 表：4 行
- DictItem 表：9 行
- LoginLog 表：12 行
- OperationLog 表：10 行
- UserRole 表：16 行
- UserPosition 表：12 行
- RoleMenu 表：96 行

---

### Step 6: 反复执行 seed 验证可重复性

- [ ] 再次运行 seed 脚本（验证清空+重新插入逻辑）

```bash
pnpm --filter @sekiro/api exec prisma db seed
```

Expected: 成功完成，无约束冲突错误

---

### Step 7: Commit Task 3

- [ ] 提交完整 Seed 脚本

```bash
cd <PROJECT_ROOT>
git add apps/api/prisma/seed.ts apps/api/package.json
git commit -m "feat(api): 完整 Seed 数据脚本实现

数据统计（105+ 条记录）:
- 12 个用户（超管 + 11 普通），密码 bcrypt 哈希
- 7 个角色 + 精细菜单权限映射（96 条关联）
- 完整菜单树（16 条，含 3 个按钮）
- 部门树（10 条）+ 岗位（6 条）+ 字典（4 种 9 项）
- 登录日志（12 条）+ 操作日志（10 条）
- 用户-岗位（12 条）+ 用户-角色（16 条）关联

密码策略:
- 超管（admin）固定 admin123
- 其他用户 12 位随机，bcrypt cost=10
- Seed 完成后输出所有密码供测试使用

可重复执行（先 truncate 后 insert）"
```

---

## Task 4: 集成验证与文档

**Files:**
- Create: `apps/api/.env.seed` (可选，记录 seed 注意事项)
- 验证：全部 Seed 数据可查询，PrismaService 可注入

**Interfaces:**
- Consumes: Task 1 的 PrismaService、Task 3 的完整 Seed 数据
- Produces: 可用的数据库环境 + 文档说明

---

### Step 1: 运行完整测试流程

- [ ] 清空数据库并重新 seed

```bash
pnpm --filter @sekiro/api exec prisma db push
pnpm --filter @sekiro/api exec prisma db seed
```

Expected: 全部成功，无错误

---

### Step 2: 验证 PrismaService 可在应用中使用

- [ ] 查看 `apps/api/src/main.ts`，确认后续可导入 `PrismaModule`

```bash
cat apps/api/src/main.ts
```

Expected: 文件存在（Task 1 时已创建的最小骨架）

---

### Step 3: 创建 Seed 相关的 README 说明

- [ ] 更新 `apps/api/README.md`，加入 seed 使用说明

找到 "## 下一步" 部分，在前面加：

```markdown
## Seed 数据

项目包含完整的示例数据 seed 脚本（`prisma/seed.ts`），覆盖：
- 12 个用户（含超管账号 `admin / admin123`）
- 7 个角色 + 精细菜单权限映射
- 完整的部门树、岗位、菜单树、字典
- 登录日志和操作日志示例

### 快速初始化数据库

```bash
# 建表
pnpm --filter @sekiro/api exec prisma db push

# 灌入示例数据
pnpm --filter @sekiro/api exec prisma db seed

# 查看数据（可选）
pnpm --filter @sekiro/api exec prisma studio
```

### 测试账号

| 账号 | 密码 | 权限 |
|------|------|------|
| admin | admin123 | 超级管理员 |
| zhangsan | 见控制台输出 | 管理员 |
| ... | 见控制台输出 | 各专员角色 |

Seed 脚本完成时会输出所有账号密码。

### 反复运行 Seed

Seed 脚本每次执行都会先清空所有数据再重新插入，支持反复执行：

```bash
pnpm --filter @sekiro/api exec prisma db seed
```

**注意**：生产环境不应包含此 seed 脚本。
```

---

### Step 4: 最终验证 TypeScript + Lint

- [ ] 全量 TypeScript 检查

```bash
pnpm typecheck
```

Expected: 通过，无错误

---

### Step 5: Commit Task 4

- [ ] 提交集成验证和文档更新

```bash
cd <PROJECT_ROOT>
git add apps/api/README.md
git commit -m "docs(api): Seed 脚本使用说明

- 补充 Seed 数据说明和测试账号列表
- 说明如何快速初始化数据库
- 标注生产环境注意事项"
```

---

## 验收清单

- [ ] PrismaService 类实现，继承 PrismaClient，自动生命周期管理
- [ ] PrismaModule 导出，可被其他 module 注入
- [ ] Seed 脚本完成执行：105+ 示例数据全部入库
- [ ] `pnpm --filter @sekiro/api exec prisma db seed` 成功，输出密码表
- [ ] 反复执行 seed 不出错
- [ ] 所有用户密码 bcrypt 正确哈希（超管 `admin123`，其他随机）
- [ ] 角色-菜单权限映射（96 条）符合设计规则
- [ ] TypeScript 全量检查通过
- [ ] README.md 更新，说明 seed 使用方法
- [ ] 3 个 commit 已提交

---

## 完成后的衔接

这份计划完成后：

1. **PrismaService** 作为全局依赖可用，后续所有 module（user/role/auth...）都通过注入 `PrismaService` 访问数据库
2. **Seed 数据** 完整可用，前端 `/login` 可用 `admin/admin123` 测试，后续 Story #6（Auth 登录接口）有真实数据依赖
3. **验收标准** 为后续开发奠定稳固的数据基础

---

**准备就绪，可开始实施！** 🚀
