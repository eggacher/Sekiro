# Task 3 Report: Auth Store + AuthProvider + 登录页真实登录

## 1. What was implemented

### Frontend

1. **`apps/web/lib/store/auth-store.ts`**
   - Created a Zustand auth store with `persist` middleware.
   - State: `token`, `user` (`CurrentUser | null`), `permissions`, `menus`.
   - Actions: `setAuth`, `clearAuth`, `isAuthenticated`.
   - Persists only `token` to `localStorage` under the key `sekiro-auth` and also syncs the active token to `STORAGE_KEYS.TOKEN` so `apiClient` can read it.

2. **`apps/web/components/providers/auth-provider.tsx`**
   - Created a client-side `AuthProvider` that wraps the app in `layout.tsx`.
   - On mount it checks `localStorage` for a token.
   - Public paths (e.g. `/login`) render immediately.
   - For protected paths, it calls `GET /auth/me`:
     - On success: hydrates the auth store with `user`, `permissions`, `menus`.
     - On failure (or no token): clears the store and redirects to `/login`.
   - Shows a simple "加载中…" placeholder while validating the session.

3. **`apps/web/app/layout.tsx`**
   - Wrapped the app content with `<AuthProvider>`.

4. **`apps/web/app/(auth)/login/page.tsx`**
   - Replaced the simulated `setTimeout` login with a real API call to `POST /auth/login` via `apiClient`.
   - On success, maps the `LoginResponse` to a `CurrentUser` and stores token/user/permissions/menus via `useAuthStore.setAuth`.
   - Removed the "任意密码可进入" placeholder subtitle.

### Backend

Because the frontend `AuthProvider` requires `GET /auth/me` and the existing `AuthController` only exposed `/auth/login`, `/auth/refresh`, and `/auth/logout`, I added the missing endpoint:

1. **`apps/api/src/modules/auth/services/auth.service.ts`**
   - Added `getMe(userId: number)` which queries the user, computes permissions/menus via existing helpers, and returns `{ user: CurrentUser, permissions, menus }`.

2. **`apps/api/src/modules/auth/auth.controller.ts`**
   - Added `GET /auth/me` protected by `JwtAuthGuard`, returning the standard `ApiResponse` wrapper.

## 2. What was tested and results

| Command | Result |
| --- | --- |
| `pnpm --filter @sekiro/web typecheck` | ✅ Passed |
| `pnpm --filter @sekiro/api typecheck` | ✅ Passed |
| `pnpm --filter @sekiro/api test` | ✅ 101 tests passed |

## 3. Files changed

- `apps/web/lib/store/auth-store.ts` (created)
- `apps/web/components/providers/auth-provider.tsx` (created)
- `apps/web/app/layout.tsx` (modified)
- `apps/web/app/(auth)/login/page.tsx` (modified)
- `apps/api/src/modules/auth/services/auth.service.ts` (modified)
- `apps/api/src/modules/auth/auth.controller.ts` (modified)

## 4. Self-review findings

- The auth store matches the brief except I added `isAuthenticated()` as a method because the brief description explicitly listed it in the exposed interface while the code snippet omitted it.
- `AuthProvider` reads `localStorage` directly for the token rather than waiting for Zustand rehydration. This is consistent with how `apiClient` reads the token and avoids a hydration race.
- `AuthProvider` uses `router.replace("/login")` instead of `push` so unauthenticated users cannot navigate back to the protected page.
- The login page maps `LoginResponse.user` to `CurrentUser`; `roles` is set to `[]` because the login response does not include role codes. `/auth/me` returns the real role codes.
- Pre-existing modifications to `.superpowers/sdd/progress.md`, `.superpowers/sdd/task-3-brief.md`, `apps/api/src/modules/dept/services/dept.service.ts`, `apps/web/components/shared/crud-table.tsx`, and the untracked `docs/superpowers/plans/2026-07-05-frontend-infrastructure.md` were left unstaged because they are not part of this task's implementation.

## 5. Issues or concerns

1. **`/auth/me` response on 401**: NestJS `JwtAuthGuard` throws `UnauthorizedException`, which yields an HTTP 401 with a JSON body. `apiClient` currently throws `HTTP 401` before parsing the body because of the `!res.ok` check. The `AuthProvider` still handles this by redirecting, but the error message is not user-friendly. This is a pre-existing client behavior, not introduced by this change.
2. **Role codes on login**: The login response does not return role codes, so the `CurrentUser` constructed after login has an empty `roles` array. The first `/auth/me` refresh (on app reload or route change) will populate them correctly.
3. **No automated frontend tests**: The web package has no test suite set up, so the new provider/store were only verified with TypeScript type checking.
