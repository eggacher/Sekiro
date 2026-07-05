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

