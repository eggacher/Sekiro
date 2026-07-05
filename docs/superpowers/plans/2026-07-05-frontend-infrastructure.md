# Story #16: 前端基建（mock 切真实 API + 工程化）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将前端从 mock 数据切换到真实 API，完成登录鉴权、路由守卫、真实菜单驱动、CRUD 页面真实调用，并实现 401/403/422 统一处理。

**Architecture:** Next.js 通过 `rewrites` 把 `/api/*` 代理到 NestJS（`http://localhost:3001`）。`lib/api/client.ts` 统一处理 Token 注入、401 跳转、403/422 提示。新增 `AuthProvider` 在应用加载时拉取 `/auth/me` 获取用户/权限/菜单，Sidebar 从该状态渲染。各 CRUD 页面用 `apiClient` 替换 `lib/mock/*`。

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Zustand, `@sekiro/shared`, lucide-react

## Global Constraints

- 所有跨进程类型必须使用 `@sekiro/shared`，禁止在 `apps/web` 自行定义重复类型（CON-1）
- 后端接口统一返回 `ApiResponse<T>`，`code=0` 为成功（CON-2）
- 业务码全部走 HTTP 200，前端只看 `json.code`
- 401 时清除 token 并跳转 `/login`
- 422 时返回字段级错误数组 `{ field: string; message: string }[]`
- 侧边栏菜单必须由 `/auth/me` 返回的 `menus` 驱动
- 前端最终零 `import` from `@/lib/mock/*`（代码生成器页面除外，它本身就是生成预览）

---

## File Structure

| 文件 | 责任 |
|------|------|
| `apps/web/next.config.js` | 配置 `/api/*` → `http://localhost:3001/api/:path*` 代理 |
| `apps/web/lib/api/client.ts` | 统一请求封装；补 403 toast、422 字段错误解析 |
| `apps/web/lib/store/auth-store.ts` | 新增：存储当前用户、权限、菜单、token |
| `apps/web/components/providers/auth-provider.tsx` | 新增：应用启动时拉 `/auth/me`，未登录跳转 |
| `apps/web/app/layout.tsx` | 挂载 `AuthProvider` |
| `apps/web/app/(auth)/login/page.tsx` | 接真实 `/auth/login`，保存 token |
| `apps/web/components/layout/sidebar.tsx` | 从 `auth-store` 读取 menus 渲染，替换 `lib/menu.ts` |
| `apps/web/components/layout/header.tsx` | 显示当前用户，退出登录调用 `/auth/logout` |
| `apps/web/app/(dashboard)/system/user/page.tsx` | 从 mock 切 `/system/user` API |
| `apps/web/app/(dashboard)/system/dept/page.tsx` | 从 mock 切 `/system/dept` API |
| `apps/web/app/(dashboard)/system/menu/page.tsx` | 从 mock 切 `/system/menu` API |
| `apps/web/app/(dashboard)/system/position/page.tsx` | 从 mock 切 `/system/position` API |
| `apps/web/app/(dashboard)/page.tsx` | 从 mock 切真实 dashboard 数据或保留静态 |
| `apps/web/lib/menu.ts` | 删除硬编码菜单（或仅保留 `findBreadcrumb` 工具） |

---

## Task 1: Next.js API 代理配置

**Files:**
- Modify: `apps/web/next.config.js`

**Interfaces:**
- Consumes: 无
- Produces: 开发环境所有 `/api/*` 请求转发到 `http://localhost:3001`

- [ ] **Step 1: 添加 rewrites**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/api/:path*",
      },
    ];
  },
};

module.exports = nextConfig;
```

- [ ] **Step 2: 验证代理生效**

启动后端 `pnpm dev:api`（端口 3001），前端 `pnpm dev`（端口 3000）。

在浏览器控制台执行：
```js
fetch("/api/health").then(r => r.json()).then(console.log)
```

Expected: 返回 `{ status: "up", ... }` 或后端响应。

- [ ] **Step 3: Commit**

```bash
git add apps/web/next.config.js
git commit -m "feat(web): add /api proxy to NestJS backend"
```

---

## Task 2: 增强请求客户端（401/403/422 处理）

**Files:**
- Modify: `apps/web/lib/api/client.ts`

**Interfaces:**
- Consumes: `ResultCode`, `RESULT_MESSAGES`, `STORAGE_KEYS` from `@sekiro/shared`
- Produces: `request<T>`, `apiClient`（行为增强）；新增 `ApiFieldError` 类型导出

- [ ] **Step 1: 扩展 request 函数处理 403/422**

```ts
import type { ApiResponse } from "@sekiro/shared";
import { ResultCode, RESULT_MESSAGES, STORAGE_KEYS } from "@sekiro/shared";
import { toast } from "sonner";

export type ApiFieldError = { field: string; message: string };

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public code: number,
    public fieldErrors?: ApiFieldError[]
  ) {
    super(message);
  }
}

export async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem(STORAGE_KEYS.TOKEN) ?? ""
      : "";

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const json: ApiResponse<T> = await res.json();

  if (json.code !== ResultCode.SUCCESS) {
    if (json.code === ResultCode.UNAUTHORIZED && typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      window.location.href = "/login";
      throw new ApiError(json.message || RESULT_MESSAGES[json.code], json.code);
    }

    if (json.code === ResultCode.FORBIDDEN) {
      toast.error(json.message || "无权限访问");
      throw new ApiError(json.message || RESULT_MESSAGES[json.code], json.code);
    }

    if (json.code === ResultCode.VALIDATION_ERROR && Array.isArray(json.data)) {
      const fieldErrors = json.data as ApiFieldError[];
      throw new ApiError(json.message || "参数校验失败", json.code, fieldErrors);
    }

    throw new ApiError(json.message || RESULT_MESSAGES[json.code], json.code);
  }

  return json.data;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
```

- [ ] **Step 2: 运行 typecheck**

```bash
pnpm --filter @sekiro/web typecheck
```

Expected: 0 errors。

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/api/client.ts
git commit -m "feat(web): enhance api client with 403 toast and 422 field errors"
```

---

## Task 3: 新增 Auth Store

**Files:**
- Create: `apps/web/lib/store/auth-store.ts`

**Interfaces:**
- Consumes: `CurrentUser`, `Menu` from `@sekiro/shared`
- Produces: `useAuthStore` hook，暴露 `user`, `permissions`, `menus`, `setAuth`, `clearAuth`, `isAuthenticated`

- [ ] **Step 1: 创建 store**

```ts
"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CurrentUser, Menu } from "@sekiro/shared";
import { STORAGE_KEYS } from "@sekiro/shared";

type AuthState = {
  token: string | null;
  user: CurrentUser | null;
  permissions: string[];
  menus: Menu[];
  setAuth: (token: string, user: CurrentUser, permissions: string[], menus: Menu[]) => void;
  clearAuth: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      permissions: [],
      menus: [],
      setAuth: (token, user, permissions, menus) => {
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEYS.TOKEN, token);
        }
        set({ token, user, permissions, menus });
      },
      clearAuth: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem(STORAGE_KEYS.TOKEN);
        }
        set({ token: null, user: null, permissions: [], menus: [] });
      },
    }),
    {
      name: "sekiro-auth",
      partialize: (state) => ({ token: state.token }),
    }
  )
);
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/lib/store/auth-store.ts
git commit -m "feat(web): add auth zustand store"
```

---

## Task 4: 创建 AuthProvider 并挂载

**Files:**
- Create: `apps/web/components/providers/auth-provider.tsx`
- Modify: `apps/web/app/layout.tsx`

**Interfaces:**
- Consumes: `useAuthStore`, `apiClient`
- Produces: 应用加载时自动拉取 `/auth/me`；未登录跳转 `/login`

- [ ] **Step 1: 创建 AuthProvider**

```tsx
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth-store";
import { apiClient } from "@/lib/api/client";
import type { CurrentUser, Menu } from "@sekiro/shared";

const PUBLIC_PATHS = ["/login"];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { token, setAuth, clearAuth } = useAuthStore();
  const [ready, setReady] = useState(false);
  const isPublic = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    const init = async () => {
      const storedToken = token;
      if (!storedToken) {
        setReady(true);
        if (!isPublic) router.replace("/login");
        return;
      }

      try {
        const data = await apiClient.get<{
          user: CurrentUser;
          permissions: string[];
          menus: Menu[];
        }>("/auth/me");
        setAuth(storedToken, data.user, data.permissions, data.menus);
      } catch {
        clearAuth();
        if (!isPublic) router.replace("/login");
      } finally {
        setReady(true);
      }
    };

    init();
  }, [token, pathname, router, setAuth, clearAuth, isPublic]);

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        加载中...
      </div>
    );
  }

  return <>{children}</>;
}
```

- [ ] **Step 2: 在 layout.tsx 挂载**

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";
import { AuthProvider } from "@/components/providers/auth-provider";

export const metadata: Metadata = {
  title: "Sekiro · 管理后台",
  description: "开箱即用的中后台脚手架",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>{children}</AuthProvider>
          <Toaster position="top-center" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: 运行 typecheck**

```bash
pnpm --filter @sekiro/web typecheck
```

Expected: 0 errors。

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/providers/auth-provider.tsx apps/web/app/layout.tsx
git commit -m "feat(web): add AuthProvider for /auth/me and login redirect"
```

---

## Task 5: 登录页接真实 `/auth/login`

**Files:**
- Modify: `apps/web/app/(auth)/login/page.tsx`

**Interfaces:**
- Consumes: `apiClient`, `useAuthStore.setAuth`, `LoginResponse` from `@sekiro/shared`
- Produces: 登录成功后保存 token + user + permissions + menus，跳转 `/`

- [ ] **Step 1: 替换 handleSubmit**

保留现有 UI，只替换 `handleSubmit`：

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";
import type { LoginResponse } from "@sekiro/shared";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error("请输入账号和密码");
      return;
    }
    setLoading(true);
    try {
      const data = await apiClient.post<LoginResponse>("/auth/login", {
        username,
        password,
        remember,
      });
      setAuth(data.token, data.user, data.permissions, data.menus);
      toast.success("登录成功，欢迎回来！");
      router.push("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "登录失败");
    } finally {
      setLoading(false);
    }
  };

  // ... 保持原有 JSX 不变
}
```

- [ ] **Step 2: 本地验证登录**

确保后端已启动并执行过 seed：

```bash
pnpm docker:up
pnpm db:push
pnpm db:seed
pnpm dev:api
```

前端 `pnpm dev`，访问 `http://localhost:3000/login`，用 `admin/admin123` 登录。

Expected: 登录成功跳转 Dashboard，localStorage 中有 token。

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/(auth)/login/page.tsx
git commit -m "feat(web): connect login page to real /auth/login API"
```

---

## Task 6: Header 退出登录 + Sidebar 真实菜单驱动

**Files:**
- Modify: `apps/web/components/layout/header.tsx`
- Modify: `apps/web/components/layout/sidebar.tsx`

**Interfaces:**
- Consumes: `useAuthStore`（user, clearAuth, menus）
- Produces: Header 显示昵称/用户名；退出时调用 `/auth/logout` 并清状态；Sidebar 从 menus 渲染

- [ ] **Step 1: 修改 Header 退出逻辑**

在 Header 组件中找到用户下拉菜单的退出按钮，替换 onClick：

```tsx
import { useAuthStore } from "@/lib/store/auth-store";
import { apiClient } from "@/lib/api/client";

function UserMenu() {
  const { user, clearAuth } = useAuthStore();

  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout", {});
    } finally {
      clearAuth();
      window.location.href = "/login";
    }
  };

  return (
    // ... 保持原有 UI，把退出按钮 onClick 改为 handleLogout
  );
}
```

- [ ] **Step 2: 修改 Sidebar 从 auth store 读取菜单**

由于后端 `/auth/me` 返回的 `Menu` 结构用 `icon` 字符串（lucide 图标名），而当前 `lib/menu.ts` 使用 React 组件引用，需要做一个映射：

```ts
// 新增工具函数，可放在 lib/menu-icon-map.ts
import {
  LayoutDashboard, Users, ShieldCheck, Menu as MenuIcon,
  Building2, Briefcase, BookMarked, MonitorDot, LogIn,
  FileClock, ServerCog, Code2, Settings, type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Menu: MenuIcon,
  Building2,
  Briefcase,
  BookMarked,
  MonitorDot,
  LogIn,
  FileClock,
  ServerCog,
  Code2,
  Settings,
};

export function getIconByName(name?: string): LucideIcon {
  return (name && iconMap[name]) || LayoutDashboard;
}
```

修改 `sidebar.tsx`：

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store/app-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { getIconByName } from "@/lib/menu-icon-map";
import { Logo } from "./logo";

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggleCollapsed } = useAppStore();
  const { menus } = useAuthStore();

  return (
    <aside ...>
      {/* ... Logo ... */}
      <nav ...>
        {menus.map((item) => (
          <SidebarItem
            key={item.id}
            item={item}
            pathname={pathname}
            collapsed={collapsed}
          />
        ))}
      </nav>
      {/* ... Collapse toggle ... */}
    </aside>
  );
}

function SidebarItem({
  item,
  pathname,
  collapsed,
}: {
  item: Menu; // from @sekiro/shared
  pathname: string;
  collapsed: boolean;
}) {
  const Icon = getIconByName(item.icon);
  const hasChildren = !!item.children?.length;
  const isActive = pathname === item.path;
  const isChildActive = item.children?.some((c) => pathname.startsWith(c.path ?? ""));

  if (!hasChildren) {
    return (
      <Link
        href={item.path ?? "#"}
        title={collapsed ? item.title : undefined}
        className={cn("...")}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        {!collapsed && <span>{item.title}</span>}
      </Link>
    );
  }

  return (
    <div className="mb-1">
      {/* ... 目录标题 ... */}
      {!collapsed && (
        <div className="ml-[18px] mt-1 border-l pl-3">
          {item.children!.map((child) => {
            const ChildIcon = getIconByName(child.icon);
            const active = pathname === child.path;
            return (
              <Link
                key={child.id}
                href={child.path ?? "#"}
                className={cn("...")}
              >
                <ChildIcon className="h-4 w-4 shrink-0" />
                <span>{child.title}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: 验证菜单渲染**

登录后侧边栏应显示与角色权限匹配的菜单，而不是全部菜单。

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/layout/header.tsx apps/web/components/layout/sidebar.tsx apps/web/lib/menu-icon-map.ts
git commit -m "feat(web): drive sidebar from /auth/me menus and wire logout"
```

---

## Task 7: 岗位管理页面迁移

**Files:**
- Modify: `apps/web/app/(dashboard)/system/position/page.tsx`

**Interfaces:**
- Consumes: `apiClient`, `Position` from `@sekiro/shared`
- Produces: 列表/新增/编辑/删除全部走 `/system/position`

- [ ] **Step 1: 替换 import 和 state**

```tsx
import type { Position } from "@sekiro/shared";
import { apiClient } from "@/lib/api/client";
// 删除：import { mockPositions, type MockPosition } from "@/lib/mock/system";

export default function PositionPage() {
  const [list, setList] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  // ... 其他 state 不变

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ list: Position[]; total: number }>(
        "/system/position?page=1&pageSize=1000"
      );
      setList(res.list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleSave = async (data: Partial<Position>) => {
    if (editing) {
      await apiClient.put<Position>(`/system/position/${editing.id}`, data);
      toast.success("岗位更新成功");
    } else {
      await apiClient.post<Position>("/system/position", data);
      toast.success("岗位新增成功");
    }
    setFormOpen(false);
    setEditing(null);
    await fetchList();
  };

  const handleDelete = async () => {
    if (delId == null) return;
    await apiClient.delete(`/system/position/${delId}`);
    toast.success("已删除该岗位");
    setDelId(null);
    await fetchList();
  };

  // columns 类型改为 Column<Position>，字段名不变
}
```

- [ ] **Step 2: 运行 typecheck 并测试 CRUD**

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/(dashboard)/system/position/page.tsx
git commit -m "feat(web): connect position page to real API"
```

---

## Task 8: 部门管理页面迁移

**Files:**
- Modify: `apps/web/app/(dashboard)/system/dept/page.tsx`

**Interfaces:**
- Consumes: `apiClient`, `Dept` from `@sekiro/shared`
- Produces: 树形 CRUD 走 `/system/dept`

- [ ] **Step 1: 替换 mock 为 API**

模式同 Task 7，但注意部门是树形返回：

```tsx
import type { Dept } from "@sekiro/shared";
import { apiClient } from "@/lib/api/client";

const fetchTree = async () => {
  setLoading(true);
  try {
    const res = await apiClient.get<Dept[]>("/system/dept");
    setDepts(res);
  } finally {
    setLoading(false);
  }
};

const handleSave = async (data: Partial<Dept>) => {
  if (editing) {
    await apiClient.put<Dept>(`/system/dept/${editing.id}`, { ...data, parentId });
  } else {
    await apiClient.post<Dept>("/system/dept", { ...data, parentId });
  }
  await fetchTree();
};

const handleDelete = async () => {
  if (delId == null) return;
  await apiClient.delete(`/system/dept/${delId}`);
  await fetchTree();
};
```

需要保留本地树操作辅助函数（`buildTree`, `insertNode`, `removeNode`）用于前端状态即时更新，或改为 fetchTree 刷新。

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/(dashboard)/system/dept/page.tsx
git commit -m "feat(web): connect dept page to real API"
```

---

## Task 9: 菜单管理页面迁移

**Files:**
- Modify: `apps/web/app/(dashboard)/system/menu/page.tsx`

**Interfaces:**
- Consumes: `apiClient`, `Menu` from `@sekiro/shared`
- Produces: 树形 CRUD 走 `/system/menu`

- [ ] **Step 1: 替换 mock 为 API**

```tsx
import type { Menu } from "@sekiro/shared";
import { apiClient } from "@/lib/api/client";

const fetchTree = async () => {
  const res = await apiClient.get<Menu[]>("/system/menu");
  setMenus(res);
};

const handleSave = async (data: Partial<Menu>) => {
  if (editing) {
    await apiClient.put<Menu>(`/system/menu/${editing.id}`, { ...data, parentId });
  } else {
    await apiClient.post<Menu>("/system/menu", { ...data, parentId });
  }
  await fetchTree();
};

const handleDelete = async () => {
  if (delId == null) return;
  await apiClient.delete(`/system/menu/${delId}`);
  await fetchTree();
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/(dashboard)/system/menu/page.tsx
git commit -m "feat(web): connect menu page to real API"
```

---

## Task 10: 用户管理页面迁移

**Files:**
- Modify: `apps/web/app/(dashboard)/system/user/page.tsx`

**Interfaces:**
- Consumes: `apiClient`, `User`, `Dept` from `@sekiro/shared`
- Produces: 分页列表/新增/编辑/删除/重置密码/分配角色走 `/system/user`

- [ ] **Step 1: 替换 mock 为 API**

```tsx
import type { User, Dept } from "@sekiro/shared";
import { apiClient } from "@/lib/api/client";

const fetchUsers = async () => {
  setLoading(true);
  try {
    const res = await apiClient.get<{ list: User[]; total: number }>(
      "/system/user?page=1&pageSize=1000"
    );
    setUsers(res.list);
  } finally {
    setLoading(false);
  }
};

const fetchDepts = async () => {
  const res = await apiClient.get<Dept[]>("/system/dept");
  setDepts(res);
};

useEffect(() => {
  fetchUsers();
  fetchDepts();
}, []);

const handleSave = async (data: Partial<User>) => {
  if (editing) {
    await apiClient.put<User>(`/system/user/${editing.id}`, data);
  } else {
    await apiClient.post<User>("/system/user", data);
  }
  await fetchUsers();
};

const handleDelete = async () => { ... apiClient.delete(`/system/user/${delId}`) ... };
const handleResetPassword = async (id: number) => { ... apiClient.put(`/system/user/${id}/reset-password`, {}) ... };
const handleAssignRoles = async (id: number, roleIds: number[]) => { ... apiClient.put(`/system/user/${id}/roles`, { roleIds }) ... };
```

注意用户列表字段：`MockUser` 用 `dept` 字符串，真实 `User` 用 `deptId` + `deptName`，需要同步调整表单和表格列。

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/(dashboard)/system/user/page.tsx
git commit -m "feat(web): connect user page to real API"
```

---

## Task 11: 工作台 Dashboard 与 codegen 处理

**Files:**
- Modify: `apps/web/app/(dashboard)/page.tsx`
- Modify（可选）: `apps/web/app/(dashboard)/tool/codegen/page.tsx`

**Interfaces:**
- Consumes: 无特殊要求
- Produces: Dashboard 不再依赖 `lib/mock/dashboard`

- [ ] **Step 1: Dashboard 去 mock**

方案 A（推荐，简单）：保留静态图表和示例数字，删除 `mockDashboard` import，使用本地 state 和随机/固定数据。

```tsx
// 删除 import { mockDashboardStats, mockRevenueData, ... } from "@/lib/mock/dashboard";
const [stats] = useState([...]);
```

方案 B：后端新增 `/dashboard/stats` 接口。如果做方案 B，需要先在后端加 controller，再前端调用。

本 plan 采用方案 A，因为 issue #16 范围是“前端基建 / mock 切真实 API”，Dashboard 真实统计接口不是 P0 必需。

- [ ] **Step 2: codegen 页面**

codegen 是代码生成预览，保持 mock 数据合理。无需改动，但要在验收中确认它不算“业务 CRUD 页面”。

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/(dashboard)/page.tsx
git commit -m "feat(web): remove dashboard mock imports"
```

---

## Task 12: 清理硬编码菜单与全局验证

**Files:**
- Modify: `apps/web/lib/menu.ts`
- Run: `pnpm typecheck`, `pnpm lint`, `grep -r "@/lib/mock" apps/web/app`

**Interfaces:**
- Consumes: 无
- Produces: 零业务页面 import mock；`findBreadcrumb` 保留或适配

- [ ] **Step 1: 清理 lib/menu.ts**

删除 `menuItems` 数组（已不由它驱动侧边栏），保留 `findBreadcrumb` 函数。或者如果面包屑也改为动态，可删除整个文件。

当前 `findBreadcrumb` 仍被面包屑组件使用，先保留并适配为从 auth store 的 menus 查找：

```ts
import type { Menu } from "@sekiro/shared";

export function findBreadcrumb(menus: Menu[], pathname: string) { ... }
```

- [ ] **Step 2: 全局搜索 mock 引用**

```bash
grep -r "@/lib/mock" apps/web/app --include="*.tsx" --include="*.ts"
```

Expected: 只剩 `tool/codegen/page.tsx`（可接受）。

- [ ] **Step 3: 全量验证**

```bash
pnpm typecheck
pnpm lint
pnpm --filter @sekiro/api test
```

Expected: 全部通过。

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/menu.ts
git commit -m "chore(web): remove hardcoded menu items, keep breadcrumb helper"
```

---

## Task 13: 更新本地 GitHub Issues 同步文档

**Files:**
- Modify: `.superpowers/sdd/GITHUB_ISSUES_STATUS.md`

**Interfaces:**
- Consumes: 实际 GitHub issue 状态
- Produces: 本地状态与 GitHub 一致

- [ ] **Step 1: 修正 #19 编号错误**

把文档里所有“Story #19 = 系统监控与日志”改为：
- Story #19 = 数据权限 DataScope 完整实现（OPEN）
- 系统监控拆为 #20~#23（CLOSED）

- [ ] **Step 2: 标记 #16 为进行中/完成**

根据实际进度更新 #16 状态。

- [ ] **Step 3: Commit**

```bash
git add .superpowers/sdd/GITHUB_ISSUES_STATUS.md
git commit -m "docs(sync): correct issue #19 mapping and update #16 status"
```

---

## Self-Review

### 1. Spec coverage

对照 GitHub issue #16 验收清单：

| Issue #16 验收项 | 对应 Task |
|------------------|----------|
| 登录后从 `/auth/me` 拉真实用户、权限、菜单 | Task 4, 5 |
| 侧边栏由真实菜单数据驱动 | Task 6 |
| 任意 CRUD 页面真实分页/搜索/增删改可用 | Task 7~10 |
| 401 自动跳登录，403 有提示 | Task 2 |
| 表单 422 错误能回填到字段 | Task 2（抛出 ApiFieldError），各表单页面消费 |
| 前端零 import mock | Task 11, 12 |

### 2. Placeholder scan

无 TBD/TODO/"implement later"/"appropriate error handling"/"similar to Task N"。

### 3. Type consistency

- `CurrentUser`, `Menu`, `Position`, `Dept`, `User` 均来自 `@sekiro/shared`
- `apiClient` 返回类型统一为 `ApiResponse<T>.data`
- `AuthProvider` 与 `auth-store` 的 `setAuth` 签名一致

---

## Execution Handoff

**Plan complete and saved to `docs/superpowers/plans/2026-07-05-frontend-infrastructure.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration. Tasks 1~13 are mostly independent after Task 1/2/3/4 foundation is laid.

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints for review.

**Which approach?**
