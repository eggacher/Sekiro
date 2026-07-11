# Prisma Schema 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `apps/api` 落地 Prisma schema,覆盖 SPEC §3 全部实体,通过 `prisma validate` 并能与 PG 建表打通。

**Architecture:** Prisma schema 单文件定义全部 model,通过 `@map`/`@@map` 映射到 PG snake_case 命名;软删统一 `deletedAt`,树用邻接表 `parentId`,枚举存字符串。NestJS 工程初始化作为 Task 1 的前置并入(因为 schema 验证需要可运行的 TS 环境)。

**Tech Stack:** Prisma 5.x、`@prisma/client`、TypeScript、PostgreSQL、pnpm workspace

**关联:** [spec](../specs/2026-07-04-prisma-schema-design.md) · [issue #10](https://github.com/eggacher/Sekiro/issues/10) · [issue #11](https://github.com/eggacher/Sekiro/issues/11)(docker)、[#12](https://github.com/eggacher/Sekiro/issues/12)(migrate)、[#13](https://github.com/eggacher/Sekiro/issues/13)(seed)、[#14](https://github.com/eggacher/Sekiro/issues/14)(PrismaService)

## Global Constraints

- 工作目录:`<PROJECT_ROOT>`,所有 pnpm 命令在根执行
- pnpm workspace,子包用 `pnpm --filter @sekiro/api <cmd>`
- TypeScript strict 模式(继承 `tsconfig.base.json`)
- Prisma schema 文件:`apps/api/prisma/schema.prisma`
- 命名:model 用 PascalCase,PG 表/列用 snake_case(`@map`/`@@map`)
- 所有业务表含 `createdAt`/`updatedAt`,业务实体加 `deletedAt`(软删);日志表不加
- 主键统一 `Int @id @default(autoincrement())`
- 枚举存字符串(`status`、`dataScope`、`type` 等),不用 PG enum
- 不建 sessions 表(走 Redis)
- INV-7 约定:超管 `id = 1`,由 seed 与 service 层守护

---

## 文件结构

| 文件 | 职责 | 任务 |
| --- | --- | --- |
| `apps/api/package.json`(改) | 加 Prisma 依赖与脚本 | Task 1 |
| `apps/api/tsconfig.json`(建) | TS 配置,继承 base | Task 1 |
| `apps/api/.env`(建,不入库) | DATABASE_URL | Task 1 |
| `apps/api/.env.example`(建,入库) | 示范 | Task 1 |
| `apps/api/prisma/schema.prisma`(建) | **核心:全部 model 定义** | Task 2 |
| `apps/api/prisma/schema.test.ts`(建) | 结构校证(检查 model/字段/索引存在) | Task 3 |
| `.gitignore`(查) | 确认 `.env` 已忽略 | Task 1 |

---

## Task 1: NestJS 地基 + Prisma 初始化

> Schema 验证需要可运行的 TS 环境。本 task 把 NestJS 最小骨架 + Prisma 装好,但不写业务代码——业务模块是后续 story 的事。

**Files:**
- Modify: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`、`apps/api/src/main.ts`(最小)、`apps/api/.env`、`apps/api/.env.example`
- Check: `.gitignore`

**Interfaces:**
- Produces: 可执行的 `apps/api`(prisma 能 format/validate)、根目录的 `db:*` 脚本

- [ ] **Step 1: 装依赖**

Run(根目录):
```bash
pnpm --filter @sekiro/api add prisma @prisma/client @nestjs/core @nestjs/common @nestjs/platform-express reflect-metadata rxjs
pnpm --filter @sekiro/api add -D @nestjs/cli typescript @types/node tsx
```
Expected: `apps/api/node_modules` 出现 prisma、@nestjs/*;无报错。

- [ ] **Step 2: 改 apps/api/package.json,加脚本**

把 `apps/api/package.json` 替换为:
```json
{
  "name": "@sekiro/api",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "build": "tsc",
    "start": "node dist/main.js",
    "typecheck": "tsc --noEmit",
    "prisma:generate": "prisma generate",
    "prisma:format": "prisma format",
    "prisma:validate": "prisma validate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@sekiro/shared": "workspace:*",
    "@nestjs/common": "^10.3.0",
    "@nestjs/core": "^10.3.0",
    "@nestjs/platform-express": "^10.3.0",
    "@prisma/client": "^5.18.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.0",
    "@types/node": "^20.14.10",
    "prisma": "^5.18.0",
    "tsx": "^4.16.0",
    "typescript": "^5.5.3"
  }
}
```

然后在根 `package.json` 的 `scripts` 里加(替换掉占位的 dev:api):
```json
"dev:api": "pnpm --filter @sekiro/api dev",
"db:push": "pnpm --filter @sekiro/api db:push",
"db:migrate": "pnpm --filter @sekiro/api db:migrate",
"db:studio": "pnpm --filter @sekiro/api db:studio"
```

- [ ] **Step 3: 建 tsconfig.json**

`apps/api/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node",
    "target": "ES2021",
    "outDir": "./dist",
    "rootDir": "./src",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "baseUrl": ".",
    "paths": {
      "@sekiro/shared": ["../../packages/shared/src/index.ts"]
    }
  },
  "include": ["src/**/*", "prisma/**/*.ts"]
}
```
> NestJS 需要 CommonJS + decorator metadata,所以这里覆盖了 base 的 ESM 设置。

- [ ] **Step 4: 建最小 main.ts(仅为可启动,业务在后续 story)**

`apps/api/src/main.ts`:
```typescript
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { Module } from "@nestjs/common";

@Module({})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3001);
  console.log("API on http://localhost:3001");
}
bootstrap();
```

- [ ] **Step 5: 建 .env 与 .env.example**

`apps/api/.env`(本地,不入库):
```
DATABASE_URL="postgresql://sekiro:sekiro123@localhost:5432/sekiro?schema=public"
```

`apps/api/.env.example`(入库示范):
```
# 复制为 .env 并按需修改。本地 docker-compose 已用 sekiro/sekiro123
DATABASE_URL="postgresql://sekiro:sekiro123@localhost:5432/sekiro?schema=public"
```

- [ ] **Step 6: 确认 .gitignore 忽略 .env**

Run:
```bash
git check-ignore apps/api/.env && echo "OK 已忽略" || echo "⚠️ 需加规则"
```
Expected: `apps/api/.env` 后跟 `OK 已忽略`(根 .gitignore 已有 `.env` 规则)。

- [ ] **Step 7: 重新 pnpm install 让 workspace 链接生效**

Run:
```bash
pnpm install
```
Expected: 无报错,`apps/api/node_modules/.bin/prisma` 存在。

- [ ] **Step 8: 验证 prisma 可用**

Run:
```bash
pnpm --filter @sekiro/api exec prisma version
```
Expected: 打印 prisma 版本号(无 schema 时不报错)。

- [ ] **Step 9: Commit**

```bash
git add apps/api/package.json apps/api/tsconfig.json apps/api/src/main.ts apps/api/.env.example
git commit -m "feat(api): nestjs 地基 + prisma 初始化 (#10)"
```
> `.env` 不 add(被忽略)。

---

## Task 2: 起草 schema.prisma

> 核心任务。按 spec §3.2-3.4 定义全部 model。

**Files:**
- Create: `apps/api/prisma/schema.prisma`

**Interfaces:**
- Consumes: spec §3(表结构)
- Produces: 通过 `prisma validate` 的 schema 文件;Prisma Client 类型(供后续 service 用)

- [ ] **Step 1: 写 schema.prisma**

`apps/api/prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────────
// 核心域:组织与权限治理
// ─────────────────────────────────────────────

model User {
  id             Int       @id @default(autoincrement())
  username       String    @unique @db.VarChar(32)
  passwordHash   String    @map("password_hash") @db.VarChar(255)
  nickname       String    @db.VarChar(32)
  email          String?   @db.VarChar(128)
  phone          String?   @db.VarChar(20)
  avatar         String?   @db.VarChar(512)
  deptId         Int?      @map("dept_id")
  status         String    @default("enabled") @db.VarChar(16)
  lockedUntil    DateTime? @map("locked_until")
  loginFailCount Int       @default(0) @map("login_fail_count")
  lastLoginAt    DateTime? @map("last_login_at")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")
  deletedAt      DateTime? @map("deleted_at")

  dept       Dept?       @relation("UserDept", fields: [deptId], references: [id])
  roles      UserRole[]
  positions  UserPosition[]

  @@map("user")
}

model Role {
  id          Int      @id @default(autoincrement())
  name        String   @unique @db.VarChar(32)
  code        String   @unique @db.VarChar(64)
  description String?  @db.VarChar(255)
  dataScope   String   @default("self") @map("data_scope") @db.VarChar(32)
  status      String   @default("enabled") @db.VarChar(16)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")

  users UserRole[]
  menus RoleMenu[]
  depts RoleDept[]

  @@map("role")
}

model Menu {
  id         Int      @id @default(autoincrement())
  parentId   Int?     @map("parent_id")
  title      String   @db.VarChar(32)
  type       String   @db.VarChar(16)
  path       String?  @db.VarChar(128)
  component  String?  @db.VarChar(128)
  icon       String?  @db.VarChar(64)
  permission String?  @db.VarChar(128)
  sort       Int      @default(0)
  visible    Boolean  @default(true)
  cache      Boolean  @default(true)
  status     String   @default("enabled") @db.VarChar(16)
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  parent   Menu?   @relation("MenuTree", fields: [parentId], references: [id])
  children Menu[]  @relation("MenuTree")
  roles    RoleMenu[]

  @@index([parentId])
  @@map("menu")
}

model Dept {
  id        Int       @id @default(autoincrement())
  parentId  Int?      @map("parent_id")
  name      String    @db.VarChar(32)
  leader    String?   @db.VarChar(32)
  phone     String?   @db.VarChar(20)
  sort      Int       @default(0)
  status    String    @default("enabled") @db.VarChar(16)
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  parent   Dept?  @relation("DeptTree", fields: [parentId], references: [id])
  children Dept[] @relation("DeptTree")
  users    User[] @relation("UserDept")

  @@index([parentId])
  @@map("dept")
}

model Position {
  id        Int       @id @default(autoincrement())
  name      String    @unique @db.VarChar(32)
  code      String    @unique @db.VarChar(64)
  sort      Int       @default(0)
  status    String    @default("enabled") @db.VarChar(16)
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  users UserPosition[]

  @@map("position")
}

// 关联表
model UserRole {
  userId Int @map("user_id")
  roleId Int @map("role_id")
  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role   Role @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@id([userId, roleId])
  @@index([roleId])
  @@map("user_role")
}

model RoleMenu {
  roleId Int @map("role_id")
  menuId Int @map("menu_id")
  role   Role @relation(fields: [roleId], references: [id], onDelete: Cascade)
  menu   Menu @relation(fields: [menuId], references: [id], onDelete: Cascade)

  @@id([roleId, menuId])
  @@index([menuId])
  @@map("role_menu")
}

model UserPosition {
  userId     Int      @map("user_id")
  positionId Int      @map("position_id")
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  position   Position @relation(fields: [positionId], references: [id], onDelete: Cascade)

  @@id([userId, positionId])
  @@index([positionId])
  @@map("user_position")
}

model RoleDept {
  roleId Int @map("role_id")
  deptId Int @map("dept_id")
  role   Role @relation(fields: [roleId], references: [id], onDelete: Cascade)
  dept   Dept @relation(fields: [deptId], references: [id], onDelete: Cascade)

  @@id([roleId, deptId])
  @@index([deptId])
  @@map("role_dept")
}

// ─────────────────────────────────────────────
// 支撑域
// ─────────────────────────────────────────────

model DictType {
  id        Int       @id @default(autoincrement())
  name      String    @unique @db.VarChar(32)
  code      String    @unique @db.VarChar(64)
  remark    String?   @db.VarChar(255)
  status    String    @default("enabled") @db.VarChar(16)
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  items DictItem[]

  @@map("dict_type")
}

model DictItem {
  id     Int    @id @default(autoincrement())
  typeId Int    @map("type_id")
  label  String @db.VarChar(64)
  value  String @db.VarChar(64)
  sort   Int    @default(0)
  status String @default("enabled") @db.VarChar(16)
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  type DictType @relation(fields: [typeId], references: [id], onDelete: Cascade)

  @@unique([typeId, value])
  @@index([typeId])
  @@map("dict_item")
}

model SystemConfig {
  key       String   @id @db.VarChar(128)
  value     String   @db.Text
  remark    String?  @db.VarChar(255)
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("system_config")
}

// ─────────────────────────────────────────────
// 通用域:可观测(仅追加)
// ─────────────────────────────────────────────
// 注:Session 走 Redis,不建表

model LoginLog {
  id        Int      @id @default(autoincrement())
  username  String   @db.VarChar(32)
  ip        String   @db.VarChar(64)
  location  String?  @db.VarChar(128)
  browser   String?  @db.VarChar(64)
  os        String?  @db.VarChar(64)
  result    String   @db.VarChar(16)
  message   String   @db.VarChar(255)
  createdAt DateTime @default(now()) @map("created_at")

  @@index([username])
  @@index([createdAt])
  @@map("login_log")
}

model OperationLog {
  id          Int      @id @default(autoincrement())
  operator    String   @db.VarChar(32)
  module      String   @db.VarChar(64)
  type        String   @db.VarChar(16)
  description String   @db.VarChar(255)
  method      String   @db.VarChar(8)
  url         String   @db.VarChar(255)
  ip          String   @db.VarChar(64)
  cost        Int
  status      String   @db.VarChar(16)
  createdAt   DateTime @default(now()) @map("created_at")

  @@index([operator])
  @@index([createdAt])
  @@map("operation_log")
}
```

- [ ] **Step 2: format + validate**

Run:
```bash
pnpm --filter @sekiro/api exec prisma format
pnpm --filter @sekiro/api exec prisma validate
```
Expected:
- format:无输出(成功)
- validate:`The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 3: generate(确认能生成 client)**

Run:
```bash
pnpm --filter @sekiro/api exec prisma generate
```
Expected: `Generated Prisma Client`,无类型错误。

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/schema.prisma
git commit -m "feat(api): prisma schema 覆盖全部实体 (#10)"
```

---

## Task 3: schema 结构校证(验证 spec 覆盖)

> 不依赖 DB,纯静态校证 schema 是否覆盖 spec 要求的 model/字段/索引/不变量。这是 TDD 的"测期望"——先写校证,确认它能检出缺失。

**Files:**
- Create: `apps/api/prisma/schema.test.ts`

**Interfaces:**
- Consumes: `apps/api/prisma/schema.prisma`(Task 2 产出)
- Produces: 一个可重复运行的 schema 合规校证

- [ ] **Step 1: 装测试依赖**

Run:
```bash
pnpm --filter @sekiro/api add -D vitest
```

并在 `apps/api/package.json` 的 scripts 加:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 2: 写 schema 校证测试**

`apps/api/prisma/schema.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// 读 schema 文件做结构校证(不连 DB,纯静态)
const schema = readFileSync(
  resolve(__dirname, "schema.prisma"),
  "utf-8"
);

const requiredModels = [
  "User", "Role", "Menu", "Dept", "Position",
  "UserRole", "RoleMenu", "UserPosition", "RoleDept",
  "DictType", "DictItem", "SystemConfig",
  "LoginLog", "OperationLog",
];

describe("schema.prisma 结构校证 (spec §3)", () => {
  it("包含全部 model", () => {
    for (const m of requiredModels) {
      expect(schema).toMatch(new RegExp(`model ${m} \\{`));
    }
  });

  it("User 含 spec §3.2 全部字段", () => {
    const userBlock = schema.match(/model User \{[\s\S]*?\}/)![0];
    for (const f of [
      "username", "passwordHash", "nickname", "email", "phone",
      "avatar", "deptId", "status", "lockedUntil", "loginFailCount",
      "lastLoginAt", "createdAt", "updatedAt", "deletedAt",
    ]) {
      expect(userBlock).toContain(f);
    }
  });

  it("INV-1: username 唯一", () => {
    expect(schema).toMatch(/username\s+String\s+@unique/);
  });

  it("INV-8: DictItem (typeId, value) 联合唯一", () => {
    const dictItemBlock = schema.match(/model DictItem \{[\s\S]*?\}/)![0];
    expect(dictItemBlock).toContain("@@unique([typeId, value])");
  });

  it("树: Menu/Dept 有 parentId 自关联", () => {
    for (const m of ["Menu", "Dept"]) {
      const block = schema.match(new RegExp(`model ${m} \\{[\\s\\S]*?\\}`))![0];
      expect(block).toContain("parentId");
    }
  });

  it("命名: 业务表都映射 snake_case", () => {
    for (const [model, table] of [
      ["User", "user"], ["DictItem", "dict_item"],
      ["LoginLog", "login_log"], ["UserRole", "user_role"],
    ]) {
      const block = schema.match(new RegExp(`model ${model} \\{[\\s\\S]*?\\}`))![0];
      expect(block).toContain(`@@map("${table}")`);
    }
  });

  it("密码字段: 仅 passwordHash(无独立 salt)", () => {
    const userBlock = schema.match(/model User \{[\s\S]*?\}/)![0];
    expect(userBlock).toContain("passwordHash");
    expect(userBlock).not.toMatch(/salt/i);
  });

  it("日志表无软删字段", () => {
    for (const m of ["LoginLog", "OperationLog"]) {
      const block = schema.match(new RegExp(`model ${m} \\{[\\s\\S]*?\\}`))![0];
      expect(block).not.toContain("deletedAt");
    }
  });
});
```

- [ ] **Step 3: 跑测试,确认通过**

Run:
```bash
pnpm --filter @sekiro/api test
```
Expected: 全部 8 个测试 PASS。

> 如果有失败,说明 schema 与 spec 不一致——修 schema 而不是改测试。

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/schema.test.ts apps/api/package.json
git commit -m "test(api): schema 结构校证覆盖 spec (#10)"
```

---

## Task 4: 全链路验证(db push 跑通)

> 依赖 issue #11(docker-compose 起 PG)。如果 #11 未做,本 task 的 Step 2 会失败——先去做 #11。

**Files:**
- 无新建文件,纯验证

**Interfaces:**
- Consumes: Task 2 的 schema + #11 的 PG 容器

- [x] **Step 1: 确认 PG 在跑**

Run:
```bash
docker compose ps
```
Expected: `sekiro-postgres` 状态 `running` / `healthy`。如果没起,先 `pnpm docker:up`(等价 `docker compose up -d`).

✅ **完成**: sekiro-postgres Up 19 hours

- [x] **Step 2: db push 建表**

Run:
```bash
pnpm --filter @sekiro/api exec prisma db push
```
Expected: `🚀 Your database is now in sync with your Prisma schema.`,无报错。

✅ **完成**: 🚀 Your database is now in sync with your Prisma schema. Done in 434ms

- [x] **Step 3: 用 prisma studio 肉眼确认(可选)**

Run:
```bash
pnpm --filter @sekiro/api exec prisma studio
```
Expected: 浏览器打开 `http://localhost:5555`,能看到 14 个 model(user/role/menu/dept/position/user_role/role_menu/user_position/role_dept/dict_type/dict_item/system_config/login_log/operation_log)。

✅ **完成**: 确认 14 个 model 已定义(grep -c "^model" = 14)

- [x] **Step 4: 跑全部测试再次确认**

Run:
```bash
pnpm --filter @sekiro/api test
pnpm --filter @sekiro/api exec prisma validate
```
Expected: 测试全 PASS、validate 通过。

✅ **完成**: 8/8 tests PASS | schema valid ✅

- [x] **Step 5: Commit 收尾(如有变更)**

```bash
git status
# 若 schema 因 db push 反馈有微调:
git add apps/api/prisma/schema.prisma
git commit -m "chore(api): schema db push 跑通 (#10)"
```

✅ **完成**: chore(api): Task 4 完成 - schema db push 跑通 (#10) [commit 95fb6a1]

---

## 完成标准

- [x] `prisma validate` 通过 ✅
- [x] `pnpm --filter @sekiro/api test` 8 个测试全 PASS ✅
- [x] `prisma db push` 在 PG 建出 14 张表 ✅
- [x] schema 与 `@sekiro/shared` 类型一一对应(自查) ✅
- [x] 全部 commit 已提交 ✅

通过后:
- 关联 issue #10 可 `closes #10`
- 为 #11(docker,#5 已含)、#13(seed)、#14(PrismaService)提供地基
