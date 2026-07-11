# User Role Save Bug Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the user role persistence bug: ensure when a user is created or edited in the frontend `UserFormDialog`, the selected roles are successfully saved to the backend via the `/system/user/:id/roles` API.

**Architecture:** Modify the frontend submit handler `handleSave` in `apps/web/app/(dashboard)/system/user/page.tsx` to destructure `roleIds`, and call `PUT /system/user/:id/roles` after user creation or update.

**Tech Stack:** React, Next.js, TypeScript

## Global Constraints

- Backend API endpoint: `/system/user/:id/roles` (takes `{ roleIds: number[] }`)
- Target frontend file: `apps/web/app/(dashboard)/system/user/page.tsx`

---

### Task 1: Update handleSave to persist roleIds

**Files:**
- Modify: `apps/web/app/(dashboard)/system/user/page.tsx`

**Interfaces:**
- Consumes: `roleIds` from form `data` object of type `Partial<User>`
- Produces: API call `PUT /system/user/:id/roles` with `{ roleIds: number[] }`

- [ ] **Step 1: Edit page.tsx to destructure roleIds and call the roles API**

Modify [page.tsx](file:///Users/zero/projects/Sekiro/.worktrees/feature-user-role-save-bug/apps/web/app/(dashboard)/system/user/page.tsx) to update `handleSave`:

Replace the old destructuring block:
```typescript
  const handleSave = async (data: Partial<User>) => {
    // roleIds 与 status 不是 CreateUserDto / UpdateUserDto 声明的字段；
    // 全局 ValidationPipe 启用 whitelist + forbidNonWhitelisted，
    // 因此这里显式从 payload 中剔除，避免接口收到未知字段而报 422。
    const { positionIds, ...userData } = data;
    const positionIdsToAssign = positionIds ?? [];
```

with the new block:
```typescript
  const handleSave = async (data: Partial<User>) => {
    // roleIds, positionIds 与 status 不是 CreateUserDto / UpdateUserDto 声明的字段；
    // 全局 ValidationPipe 启用 whitelist + forbidNonWhitelisted，
    // 因此这里显式从 payload 中剔除，避免接口收到未知字段而报 422。
    const { positionIds, roleIds, ...userData } = data;
    const positionIdsToAssign = positionIds ?? [];
    const roleIdsToAssign = roleIds ?? [];
```

And update the edit/create API calls:
```typescript
      if (editing) {
        await apiClient.put<User>(`/system/user/${editing.id}`, userPayload);
        await apiClient.put(`/system/user/${editing.id}/positions`, {
          positionIds: positionIdsToAssign,
        });
        await apiClient.put(`/system/user/${editing.id}/roles`, {
          roleIds: roleIdsToAssign,
        });
        toast.success(t("system.user.updateSuccess"));
      } else {
        const created = await apiClient.post<User>("/system/user", userPayload);
        await apiClient.put(`/system/user/${created.id}/positions`, {
          positionIds: positionIdsToAssign,
        });
        await apiClient.put(`/system/user/${created.id}/roles`, {
          roleIds: roleIdsToAssign,
        });
        toast.success(t("system.user.createSuccess"));
      }
```

- [ ] **Step 2: Run typecheck to verify there are no compilation errors**

Run: `pnpm typecheck`
Expected: PASS (All packages typecheck cleanly)

- [ ] **Step 3: Run frontend lint check**

Run: `pnpm --filter @sekiro/web lint`
Expected: PASS (No lint errors)

- [ ] **Step 4: Run backend API tests to ensure no regressions**

Run: `pnpm --filter @sekiro/api test`
Expected: PASS (184/184 passing)

- [ ] **Step 5: Commit changes**

Run:
```bash
git add apps/web/app/\(dashboard\)/system/user/page.tsx
git commit -m "fix(web): persist user roleIds on save in user form"
```
