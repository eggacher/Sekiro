# Sekiro · 中后台脚手架（Monorepo）

> 开箱即用的中后台脚手架。前端为高保真可交互原型（Next.js + Tailwind + shadcn/ui），后端预留好按领域建模的目录结构，前后端通过 `@sekiro/shared` 共享类型。

## 🏗️ Monorepo 结构

```
Sekiro/
├── apps/
│   ├── web/          # 前端：Next.js 14 + shadcn/ui（已就绪 ✅）
│   └── api/          # 后端：按领域建模预留（待接入技术栈）
├── packages/
│   └── shared/       # 前后端共享：类型、枚举、常量（单一来源）
├── docs/             # 需求、建模、工程规格文档
├── docker-compose.yml      # 一键起 DB / Redis
├── pnpm-workspace.yaml     # Monorepo 工作区
└── tsconfig.base.json      # 根 TS 配置
```

| 包 | 名字 | 状态 | 说明 |
| --- | --- | --- | --- |
| `apps/web` | `@sekiro/web` | ✅ 可运行 | 前端原型，15 个页面 |
| `apps/api` | `@sekiro/api` | 🚧 占位 | 后端骨架，待定技术栈 |
| `packages/shared` | `@sekiro/shared` | ✅ 可用 | 类型/枚举/常量单一来源 |

---

## 🚀 快速开始

```bash
# 启用 pnpm（Node 自带 corepack）
corepack enable pnpm

# 安装依赖（国内网络建议加镜像）
pnpm install --registry=https://registry.npmmirror.com

# 启动前端
pnpm dev          # → http://localhost:3000
```

登录页**任意账号密码**即可进入（已预填 `admin / admin123`）。

> 后端 `apps/api` 待接入，详见 `apps/api/README.md`。

---

## 📦 常用脚本（根目录执行）

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动前端（= `pnpm dev:web`） |
| `pnpm build` | 构建所有 app 包 |
| `pnpm typecheck` | 全 monorepo TypeScript 类型检查 |
| `pnpm lint` | 全 monorepo lint |
| `pnpm docker:up` | 启动 Postgres + Redis（后端接入后用） |
| `pnpm clean` | 清理所有 node_modules 与构建产物 |

---

## 📚 文档体系（按阅读顺序）

文档分四层，分别回答**做什么 / 为什么 / 业务本质 / 怎么实现**：

| 文档 | 回答 | 给谁看 |
| --- | --- | --- |
| [`docs/FEATURES.md`](./docs/FEATURES.md) | 做什么（功能清单 P0/P1/P2） | 全员 |
| [`docs/PRD.md`](./docs/PRD.md) | 为什么（产品需求） | 产品 / 全员 |
| [`docs/DOMAIN_MODEL.md`](./docs/DOMAIN_MODEL.md) | 业务本质（领域建模，基于《软件方法》） | 架构 / 后端 |
| [`docs/SPEC.md`](./docs/SPEC.md) | **怎么实现才算对（接口/数据/验收）** | **工程实现 / QA** |
| [`apps/web/README.md`](./apps/web/README.md) | 前端说明 | 前端 |
| [`apps/api/README.md`](./apps/api/README.md) | 后端接入指南 | 后端 |

---

## 🔗 共享类型

`@sekiro/shared` 是 Monorepo 的核心价值——**前后端用同一套类型，改一处两端生效**：

```ts
import type { User, ApiResponse, PageResult } from "@sekiro/shared";
import { CommonStatus, ResultCode, PERMISSIONS } from "@sekiro/shared";
```

> 注意：`docs/SPEC.md` 的数据模型与接口契约以 `packages/shared` 为单一来源，二者必须保持一致。

---

## 🛣️ 后续路线

1. **确定后端技术栈**（NestJS / Spring Boot / Go）——见 `docs/SPEC.md` OP-1
2. 在 `apps/api` 实现首个接口（按 `SPEC.md §4.3` 从 `auth/login` 开始）
3. 前端把 `lib/mock/*` 替换为 `lib/api/client.ts` 的真实调用
4. 按领域模块（user/role/menu/...）逐步联调
