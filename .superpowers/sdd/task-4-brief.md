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

