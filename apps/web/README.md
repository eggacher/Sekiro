# @sekiro/web

> 前端：Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui，高保真可交互原型。

## 开发

在仓库根目录执行：

```bash
pnpm install
pnpm dev          # → http://localhost:3000
# 或单独启动本包：
pnpm --filter @sekiro/web dev
```

登录页**任意账号密码**可进入（已预填 `admin / admin123`）。

## 目录结构

```
apps/web/
├── app/
│   ├── (auth)/login/          # 登录页（Aceternity 动效背景）
│   └── (dashboard)/
│       ├── layout.tsx         # 侧边栏 + 顶栏 + 页签布局
│       ├── page.tsx           # 工作台 Dashboard
│       ├── profile/           # 个人中心
│       ├── system/            # user / role / menu / dept / position / dict
│       ├── monitor/           # online / login-log / operation-log / server
│       └── tool/              # codegen / config
├── components/
│   ├── ui/                    # shadcn 基础组件
│   ├── layout/                # Sidebar / Header / TabsNav / ThemeToggle
│   ├── shared/                # CrudTable / TreeTable / CheckableTree / StatCard
│   └── aceternity/            # AuroraBackground / CountUp 动效
├── lib/
│   ├── api/client.ts          # 后端请求封装（与 @sekiro/shared 类型对齐）
│   ├── mock/                  # 各模块 Mock 数据（已接入 shared 类型）
│   ├── store/                 # zustand 状态
│   ├── menu.ts                # 菜单元数据
│   └── utils.ts
├── public/
└── next.config.js / tailwind.config.ts / tsconfig.json
```

## 15 个页面

| 模块 | 路由 | 说明 |
| --- | --- | --- |
| 认证 | `/login` | 渐变光斑背景 + 表单入场动效 |
| 工作台 | `/` | 数据卡片(数字滚动) + 营收/流量/活跃图表 + 动态 |
| 系统管理 | `/system/user` | 用户 CRUD + 分配角色 |
| | `/system/role` | 角色 CRUD + 权限树勾选(Sheet) + 数据范围 |
| | `/system/menu` | 菜单/目录/按钮三级树形 CRUD |
| | `/system/dept` | 部门树形 CRUD |
| | `/system/position` | 岗位标准 CRUD |
| | `/system/dict` | 字典类型 + 字典项双栏管理 |
| 系统监控 | `/monitor/online` | 在线用户 + 强制下线 |
| | `/monitor/login-log` | 登录日志 |
| | `/monitor/operation-log` | 操作日志（含方法/耗时/状态） |
| | `/monitor/server` | CPU/内存/磁盘/JVM 仪表盘 + 趋势图 |
| 系统工具 | `/tool/codegen` | 表选择 + 多语言代码预览 |
| | `/tool/config` | 站点/主题/安全/通知参数配置 |
| 个人 | `/profile` | 基本/安全/通知 三 Tab |

## 接入后端

当前使用 `lib/mock/*` 的本地数据。接入 `apps/api` 时，把 mock 调用替换为 `lib/api/client.ts` 即可，组件层无需改动：

```ts
// 之前（mock）
import { mockUsers } from "@/lib/mock/system";

// 之后（真实 API）
import { apiClient } from "@/lib/api/client";
const users = await apiClient.get<User[]>("/system/user");
```

返回值类型来自 `@sekiro/shared`，前后端天然一致。

## 复用组件

- **`CrudTable`**：声明式 `columns + searchFields`，列表页 50 行内完成
- **`TreeTable`**：树形展示（菜单/部门复用）
- **`CheckableTree`**：父子联动勾选树（角色权限复用）
- **`StatCard` / `CountUp`**：数字滚动统计卡
- 菜单元数据驱动侧边栏/面包屑/页签
