# Task 4 Report: Header 退出 + Sidebar 真实菜单驱动

## 1. What was implemented

### Header logout wiring

**`apps/web/components/layout/header.tsx`**
- Imported `useAuthStore` and `apiClient`.
- Replaced the logout menu item's `router.push("/login")` with an async handler that:
  1. Calls `POST /auth/logout` via `apiClient`.
  2. Swallows request errors so logout always completes locally.
  3. Calls `clearAuth()` from the auth store to remove token/state.
  4. Uses `router.replace("/login")` to redirect without leaving the protected page in history.
- Updated the user avatar fallback and display name to read from `authStore.user` (`nickname` → `username` → fallback).

### Sidebar driven by auth-store menus

**`apps/web/lib/menu-icon-map.ts`** (new)
- Created a mapping from backend menu `icon` string values to `lucide-react` components.
- Exported `getMenuIcon(name)` with a default fallback (`Circle`) for unknown/missing icons.

**`apps/web/components/layout/sidebar.tsx`**
- Replaced the hardcoded `menuItems` from `@/lib/menu` with `menus` from `useAuthStore`.
- Added `buildSidebarMenus` helper to recursively:
  - Filter out hidden (`visible === false`), disabled (`status !== "enabled"`), and button-type nodes.
  - Preserve the existing tree structure for directory/menu nodes.
- Updated `SidebarItem` to use `Menu` type fields (`id`, `title`, `path`, `icon`, `children`) instead of the old `MenuItem` shape.
- Icon rendering now resolves through `getMenuIcon(item.icon)`.

## 2. What was tested and test results

| Command | Result |
| --- | --- |
| `pnpm --filter @sekiro/web typecheck` | ✅ Passed (0 errors) |

Manual verification steps performed:
- Confirmed `header.tsx` and `sidebar.tsx` compile against the shared `Menu`/`CurrentUser` types.
- Confirmed the new `menu-icon-map.ts` exports valid `LucideIcon` references.
- Confirmed the logout handler's async closure type-checks with `apiClient.post`.

## 3. Files changed

- `apps/web/components/layout/header.tsx` (modified)
- `apps/web/components/layout/sidebar.tsx` (modified)
- `apps/web/lib/menu-icon-map.ts` (created)

## 4. Self-review findings

- The implementation follows the existing code style and keeps changes minimal.
- `clearAuth()` is called in a `finally` block so local state is always cleared even if the network request fails.
- `router.replace` is used instead of `push` to prevent navigating back to a protected page after logout.
- Sidebar filtering respects backend visibility/status flags and excludes button permissions, matching the backend's menu-tree intent.
- The icon map currently covers the icons used in the legacy hardcoded menu. Additional backend icon names can be added to `menuIconMap` without touching sidebar logic.

## 5. Issues or concerns

1. **Header breadcrumb still uses hardcoded menus.** `header.tsx` still imports `findBreadcrumb` from `@/lib/menu`, which is based on the old static `menuItems`. Once the backend returns real menus, breadcrumb paths that exist in auth-store menus but not in `lib/menu.ts` will display as "首页". This was not part of the explicit task scope (only sidebar menus were requested), but is a known follow-up.
2. **Icon name convention dependency.** The icon map assumes backend `icon` values match the kebab-case names used here (e.g. `"shield-check"`, `"monitor-dot"`). If the backend stores different strings, icons will fall back to `Circle`.
3. **No automated frontend tests.** As with previous tasks, the web package has no test suite, so verification was limited to TypeScript type checking.
