# Story #26: Docker / CI 基础镜像与 GitHub Actions

## 定位

将 Sekiro 的后端（API）和前端（Web）分别打包为生产级 Docker 镜像，并通过 `docker compose` 在单台云服务器上完成一键部署。本次 **不包含 GitHub Actions CI pipeline**，仅完成镜像、编排与健康检查，为后续 CI/CD 留下标准化入口。

---

## 目标

1. 提供可独立构建、独立发布的 API 与 Web Docker 镜像。
2. 扩展 `docker-compose.yml`，同时支持：
   - 本地开发只起基础设施：`docker compose up -d postgres redis`
   - 完整服务启动：`docker compose up -d`
3. API 暴露 `/health` 健康检查端点，供 Docker `HEALTHCHECK` 使用。
4. 服务器部署流程：
   ```bash
   git pull origin dev
   docker compose pull        # 拉取镜像（CI 推好后）
   docker compose up -d       # 启动/更新服务
   ```

---

## 范围

### In Scope

- `apps/api/Dockerfile`：多阶段构建，生成 API 生产镜像
- `apps/web/Dockerfile`：多阶段构建，使用 Next.js standalone 输出
- `apps/web/next.config.js`：增加 `output: 'standalone'`，保留现有 rewrites
- `docker-compose.yml`：增加 `api` / `web` 服务，兼容原基础设施启动方式
- `apps/api/src/health.controller.ts`：实现 `GET /health`
- 根 `package.json`：补充/调整相关 scripts（如 `docker:build`）
- `docs/superpowers/plans/2026-07-07-docker-ci.md`：后续由 `writing-plans` skill 补充

### Out of Scope

- GitHub Actions CI / 自动推送镜像（延后到后续 Story）
- K8s / Helm / 多机部署
- 日志收集、监控告警、SSL/反向代理（如 Nginx / Traefik）
- 数据库迁移自动化（仍使用 `pnpm db:migrate` 手动执行）

---

## 架构设计

### 镜像策略

采用 **每个服务独立镜像** 的方案：

| 镜像 | 路径 | 基础镜像 | 说明 |
| --- | --- | --- | --- |
| `sekiro-api` | `apps/api/Dockerfile` | `node:20-alpine` | 多阶段：deps → builder → runner |
| `sekiro-web` | `apps/web/Dockerfile` | `node:20-alpine` | 多阶段：deps → builder → runner |

**不采用** all-in-one 单镜像或 CI 产物镜像：
- all-in-one 违反单一职责，日志/健康检查/扩缩容困难
- CI 产物镜像难以在本地复现构建过程，运维心智负担高

### API Dockerfile

```
Stage 1 deps:
  - 安装 pnpm
  - 复制 pnpm-workspace.yaml / package.json / pnpm-lock.yaml
  - 复制 apps/api/package.json + apps/web/package.json + packages/shared/package.json
  - pnpm install --frozen-lockfile

Stage 2 builder:
  - 复制源码
  - pnpm --filter @sekiro/api prisma:generate
  - pnpm --filter @sekiro/api build

Stage 3 runner:
  - 安装 dumb-init
  - 从 builder 复制 node_modules、dist、prisma/schema.prisma、package.json
  - 暴露 3001
  - HEALTHCHECK GET /health
  - CMD ["dumb-init", "node", "dist/main.js"]
```

**关键说明**：
- Prisma Client 运行时依赖 `schema.prisma` 与生成后的 client，因此 runner 阶段需要保留 `prisma/schema.prisma`。
- 使用 `dumb-init` 作为 PID 1，处理 Node 子进程信号。
- 开发依赖不进入 runner，控制镜像体积。

### Web Dockerfile

```
Stage 1 deps:
  - 安装 pnpm
  - 复制 monorepo 依赖描述文件
  - pnpm install --frozen-lockfile

Stage 2 builder:
  - 复制源码
  - 设置构建时环境变量 API_URL=http://api:3001
  - pnpm --filter @sekiro/web build

Stage 3 runner:
  - 复制 .next/standalone、.next/static、public、package.json
  - 暴露 3000
  - HEALTHCHECK GET /
  - CMD ["node", "server.js"]
```

**关键说明**：
- `next.config.js` 需要设置 `output: 'standalone'`，build 后才会生成 `.next/standalone/server.js`。
- 容器内 Web 对 API 的 rewrite 指向 `http://api:3001`，由 docker-compose 服务名解析。
- `.next/static` 需要单独复制到 standalone 目录中，否则静态资源 404。

### docker-compose.yml 设计

单一 `docker-compose.yml` 文件，包含全部服务。本地开发可以只起基础设施：

```bash
docker compose up -d postgres redis
```

完整启动：

```bash
docker compose up -d
```

关键编排：
- `api` 依赖 `postgres`（condition: service_healthy）和 `redis`（service_started）
- `web` 依赖 `api`
- API 环境变量中的数据库 host 为 `postgres`，Redis host 为 `redis`
- Web 环境变量 `API_URL=http://api:3001`

### 健康检查

API 新增 `GET /health`：

```ts
@Controller()
export class HealthController {
  @Get("/health")
  health() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}
```

- 不做数据库/Redis 探活，避免健康检查本身成为故障点
- 挂载到根路径 `/health`，不经过 `/api` 全局前缀
- 在 `AppModule` 中注册 `HealthController`

---

## 环境与配置

### API 运行时环境变量

| 变量 | 示例值 | 说明 |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://sekiro:sekiro123@postgres:5432/sekiro?schema=public` | 应用查询连接 |
| `DIRECT_DATABASE_URL` | 同上 | 迁移使用，避开连接池 |
| `REDIS_URL` | `redis://redis:6379` | Redis 连接 |
| `NODE_ENV` | `production` | 生产模式 |
| `PORT` | `3001` | API 监听端口 |

### Web 构建时环境变量

| 变量 | 示例值 | 说明 |
| --- | --- | --- |
| `API_URL` | `http://api:3001` | Next.js rewrites 目标 |

---

## 部署流程

### 本地验证

```bash
# 1. 构建镜像
docker build -t sekiro-api:latest -f apps/api/Dockerfile .
docker build -t sekiro-web:latest -f apps/web/Dockerfile .

# 2. 启动全部服务
docker compose up -d

# 3. 访问
open http://localhost:3000
open http://localhost:3001/docs
```

### 服务器部署

```bash
# 服务器上（已配置好 docker 与 ghcr 登录）
git pull origin dev
docker compose pull
docker compose up -d
```

首次部署前需要执行数据库迁移：

```bash
docker compose exec api pnpm db:migrate
# 或本地：pnpm db:migrate
```

---

## 风险与规避

| 风险 | 规避方式 |
| --- | --- |
| `tsc` 编译产物路径与运行时 `__dirname` 不一致 | Dockerfile 中保持 `dist/` 目录结构与原项目一致 |
| Prisma Client 在 runner 阶段找不到 engine | runner 保留 `prisma/schema.prisma` 与生成后的 client |
| Next.js standalone 静态资源缺失 | 单独复制 `.next/static` 到 standalone 目录 |
| 本地 `.env` 与容器环境变量冲突 | compose 中显式覆盖，不挂载 `.env` |
| worktree lint 配置冲突影响镜像构建 | Dockerfile 中不跑 lint，只跑 build |

---

## 验收标准

- [ ] `docker build -t sekiro-api:latest -f apps/api/Dockerfile .` 成功
- [ ] `docker build -t sekiro-web:latest -f apps/web/Dockerfile .` 成功
- [ ] `docker compose up -d` 后 `http://localhost:3001/health` 返回 `200 { status: "ok" }`
- [ ] `http://localhost:3001/docs` 能正常渲染 Scalar 文档
- [ ] `http://localhost:3000` 能打开前端登录页
- [ ] 登录流程走通（前端 → API → DB/Redis）
- [ ] `pnpm typecheck` 与 `pnpm --filter @sekiro/api test` 在修改后仍通过
- [ ] 本地开发原命令 `pnpm docker:up` + `pnpm dev:api` + `pnpm dev:web` 不受影响

---

## 后续可扩展

- GitHub Actions CI：在 `quality` job 通过后构建并推送镜像到 `ghcr.io/eggacher/sekiro-api` 与 `ghcr.io/eggacher/sekiro-web`
- 语义化版本 tag：`v0.1.0` 等
- 服务器自动部署：通过 webhook 或 GitHub Actions self-hosted runner 触发 `docker compose pull && up -d`
- 反向代理 + SSL：在 compose 中加入 `traefik` 或 `nginx` 服务

---

## 关联

- **Story**: #26
- **Epic**: #1 后端基础设施、#3 v0.5 生产就绪
- **相关文档**: `docs/FEATURES.md` §十（部署与运维）
