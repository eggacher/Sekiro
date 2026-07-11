# Sekiro · 现代企业级 Monorepo 中后台前后端全栈脚手架

> **Sekiro** 是一款开箱即用的中后台全栈脚手架。它采用 Monorepo 架构，前端基于最新的 **Next.js + TailwindCSS + shadcn/ui** 提供高保真可交互的精美中后台页面；后端基于 **NestJS + Prisma + PostgreSQL + Redis** 提供稳健的业务支持。前后端通过核心共享包实现接口强类型定义与权限校验的**单一真理源（Single Source of Truth）**。

---

## 🌟 项目亮点与技术选型

### 1. 核心技术栈
- **Monorepo 管理**：`pnpm workspaces` + `Turborepo`（极速并行构建与缓存）
- **前端（Web）**：`Next.js 14` (App Router) + `React` + `TailwindCSS` + `shadcn/ui` + `Zustand` (状态管理)
- **后端（API）**：`NestJS 11` + `Prisma ORM 7` + `PostgreSQL` + `Redis` (会话缓存、接口限流)
- **类型共享**：`@sekiro/shared` 共享全部核心类型、枚举、权限常数和 API 契约

### 2. 精准权限控制
- 引入**按钮级权限控制**（指令/组件级拦截）与**数据范围控制（DataScope）**。
- 支持基于菜单/角色/部门的多级复杂权限模型。

### 3. 多重安全防护
- **MFA (TOTP)**：支持二次双重身份验证（手机 Authenticator 扫码绑定）。
- **安全过滤防线**：内置 Helmet 安全头设置、接口限流防护（Rate Limiting）。
- **敏感配置加密**：支持敏感环境变量使用 `ENC(...)` 密文形式配置，并在加载时自动解密。

---

## 📐 技术架构

前后端强共享的架构模型如下图所示：

```mermaid
graph TD
    subgraph Packages [共享核心包]
        Shared["@sekiro/shared<br/>(类型、接口契约、权限常量)"]
    end

    subgraph Apps [应用服务]
        Web["@sekiro/web<br/>Next.js 14 页面端"]
        API["@sekiro/api<br/>NestJS 11 接口端"]
    end

    subgraph Data [基础设施]
        DB[(PostgreSQL 数据库)]
        Cache[(Redis 缓存服务)]
    end

    Web -->|引用共享类型| Shared
    API -->|引用共享类型| Shared
    Web -->|HTTP 请求| API
    API -->|Prisma ORM| DB
    API -->|Session / 限流| Cache
```

### 项目目录结构说明
```
Sekiro/
├── apps/
│   ├── web/                     # 🖥️ 前端页面端 (Next.js 14 + shadcn/ui)
│   └── api/                     # ⚙️ 后端接口端 (NestJS 11)
├── packages/
│   └── shared/                  # 📦 共享契约包 (类型、常量、接口契约定义)
├── docs/                        # 📚 文档体系 (需求、领域模型、开发设计 specs)
├── docker-compose.yml           # 🐳 开发/生产环境依赖一键容器启动配置
├── pnpm-workspace.yaml          # pnpm Monorepo 配置文件
└── tsconfig.base.json           # 根 TypeScript 配置文件
```

---

## 🌱 准备工作（环境安装）

在开始之前，请确认您的电脑上安装了以下必备工具。如果是小白用户，请按以下指南安装：

1. **安装 Node.js**（推荐使用 **v20.x LTS** 版本）
   - **下载地址**：[Node.js 官方网站](https://nodejs.org/)。直接下载安装程序下一步确认即可。
   - **验证**：打开命令行工具（终端/cmd），运行 `node -v` 应当输出类似 `v20.xx.x` 的字样。

2. **安装 Git**
   - **下载地址**：[Git 官方网站](https://git-scm.com/)。
   - **验证**：运行 `git --version` 应当输出版本号。

3. **安装 Docker & Docker Desktop**（用于一键起数据库和缓存，极力推荐！）
   - **下载地址**：[Docker Desktop 官方网站](https://www.docker.com/products/docker-desktop/)。安装并启动该客户端，以保证可以在命令行运行 `docker compose` 指令。

4. **安装并启用 pnpm 包管理工具**
   - 在终端执行以下命令进行全局安装：
     ```bash
     npm install -g pnpm
     ```
   - **验证**：运行 `pnpm -v` 应当输出版本号（如 `9.x.x`）。

---

## 🚀 快速上手（Step-by-Step 运行指南）

### Step 1: 克隆项目并安装依赖

首先将代码拉取到本地，并进入项目根目录：
```bash
git clone <本项目的Git仓库地址>
cd Sekiro
```
在**项目根目录**运行以下命令，自动安装所有依赖：
```bash
pnpm install
```

### Step 2: 启动本地数据库与缓存（Docker）

请确保您的 Docker Desktop 客户端已经启动。接着在项目根目录下执行以下命令，一键启动本地 PostgreSQL 与 Redis 服务：
```bash
# 启动本地 PostgreSQL 和 Redis 基础设施容器
pnpm docker:up
```
该命令会自动下载并启动以下两个容器：
- `sekiro-postgres` 数据库服务（端口：`5432`）
- `sekiro-redis` 缓存服务（端口：`6379`）

### Step 3: 配置后端环境变量

进入后端目录，将开发环境变量模版复制一份为 `.env`：
```bash
cp apps/api/.env.example apps/api/.env
```
此时 `.env` 中已默认配置好了与 Step 2 容器相匹配的数据库及缓存地址：
```env
DATABASE_URL="postgresql://sekiro:sekiro123@localhost:5432/sekiro?schema=public"
DIRECT_DATABASE_URL="postgresql://sekiro:sekiro123@localhost:5432/sekiro?schema=public"
```

### Step 4: 数据库表同步与初始化示例数据 (Seed)

确保 Step 2 数据库容器运行正常后，执行以下命令在数据库中自动创建表结构并写入预设的开发测试数据（如部门树、初始角色及测试用户）：
```bash
# 1. 在数据库中生成表结构
pnpm --filter @sekiro/api db:push

# 2. 生成 Prisma Client
pnpm --filter @sekiro/api prisma:generate

# 3. 灌入系统核心字典、菜单和演示账号等示例数据 (支持反复执行)
pnpm --filter @sekiro/api exec prisma db seed
```

执行完毕后，控制台会输出完整的**测试账号密码表**，请留意保存。

> **💡 可选工具 (Prisma Studio)**
>
> 如果需要可视化管理数据库中的数据，您可以打开 Prisma 可视化管理后台：
> ```bash
> pnpm --filter @sekiro/api db:studio
> ```
> 浏览器会自动打开 `http://localhost:5555`，供您直观地对数据表进行增删改查。

### Step 5: 启动本地联调环境

在项目根目录下，直接执行以下命令：
```bash
# 编译共享包，并同时以热更新模式启动前端 (Next.js) 和后端 (NestJS)
pnpm dev
```
启动成功后：
- **前端页面地址**：[http://localhost:3000](http://localhost:3000)
- **后端接口文档 (Scalar API)**：[http://localhost:4000/reference](http://localhost:4000/reference)

### Step 6: 登录系统验证

打开前端页面 [http://localhost:3000](http://localhost:3000)，您可以使用以下预设账号登录：

| 账号名 (Username) | 默认密码 (Password) | 分配角色 (Role) | 说明 |
| :--- | :--- | :--- | :--- |
| **`admin`** | **`admin123`** | 超级管理员 | 拥有系统内全部最高菜单、按钮和数据范围权限 |
| **`zhangsan`** | 见 Step 4 播种输出 | 系统管理员 | 具备一般管理权限 |
| **`lisi`** | 见 Step 4 播种输出 | 开发专员 | 前端仅有受限页面，演示按钮及角色权限隔离 |

---

## 💻 常用工程化开发命令

所有命令均可在**项目根目录**下执行：

| 命令 | 对应包 | 说明 |
| :--- | :--- | :--- |
| `pnpm dev` | 全包 | 并行热更新启动前端、后端与共享包监听 |
| `pnpm build` | 全包 | 编译并打包所有应用与共享依赖包（生成生产部署包） |
| `pnpm typecheck` | 全包 | 执行全量 TypeScript 类型安全性检查 |
| `pnpm lint` | 全包 | 运行 ESLint 代码规范及格式检查 |
| `pnpm test` | apps/api | 一次性运行后端全部单元及集成测试套件 (Vitest) |
| `pnpm clean` | 全包 | 一键清空全包的 `node_modules` 与打包构建缓存，便于重装 |
| `pnpm db:reset-passwords` | apps/api | 一键重置所有数据库中的用户密码回默认密码 (开发测试调试用) |

---

## 🐳 生产环境部署

### 方案一：使用 Docker Compose 一键编译并运行整个应用（推荐）

在生产服务器拉取本项目代码后，您无需在宿主机安装 Node/pnpm/Postgres 等环境，只需执行以下一条指令，Docker 会自动在容器中构建前端、后端，并完成集群部署：

```bash
# 自动编译打包、创建镜像并以守护进程模式运行全套服务
docker compose up -d
```

### 方案二：独立打包构建并部署

如果您需要将应用部署到独立的服务端（例如私有云物理机或 PM2 守护）：

1. **编译打包**：
   ```bash
   pnpm build
   ```
2. **部署后端 (API)**：
   - 提取 `apps/api/dist` 文件夹与相关 dependencies。
   - 配置服务器生产环境变量 `.env`，修改 `DATABASE_URL` 指向您的生产数据库，确保设置强随机字符串填充 `MFA_SECRET_KEY`。
   - 启动服务：
     ```bash
     node apps/api/dist/main.js
     ```
3. **部署前端 (Web)**：
   - 提取 `apps/web/.next` 与相关静态文件包。
   - 使用 PM2 运行启动：
     ```bash
     pnpm --filter @sekiro/web start
     ```
   - 或者使用 Nginx 反向代理将 `/api/*` 请求路由到后端的 NestJS 服务。
