# Button-Level Permission Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement button-level (functional) permission control across the Sekiro admin system — backend enforces via Session-cached permissions + `@RequiresPermissions` decorator + `PermissionGuard`; frontend hides buttons the user lacks permission for via a `usePermission` hook + `<HasPermission>` wrapper.

**Architecture:** At login, flat `permissions[]` + real role codes `roles[]` are written into the Redis `Session`. `JwtAuthGuard` (already fetching the session) attaches them to `req.user`. A new `PermissionGuard` reads `@RequiresPermissions` metadata, short-circuits for `super_admin`, then does an O(1) `Set.includes` check. `/auth/me` recomputes and writes permissions back to the session (the staleness refresh point). Frontend `usePermission` mirrors the same super-admin bypass; `<HasPermission>` returns `null` to hide unauthorized buttons.

**Tech Stack:** NestJS 11 (backend), Prisma 7, Redis 4, Vitest; Next.js 14 + React 18 + Zustand + shadcn/ui (frontend); `@sekiro/shared` workspace package for shared constants/types.

## Global Constraints

- Permission identifier format: `module:resource:action`, regex `^[a-z]+(-[a-z]+)*(:[a-z]+(-[a-z]+)*){2}$` (hyphens allowed in resource/action segments).
- Super-admin bypass role code: `super_admin` (shared constant `SUPER_ADMIN_ROLE`).
- Guard execution order: `@UseGuards(JwtAuthGuard, PermissionGuard)` (left-to-right; `JwtAuthGuard` populates `req.user` first).
- Self-service ops (`PUT /system/user/profile`, `PUT /system/user/password`) are NOT permission-gated.
- Stale permissions accepted until next `/auth/me` refresh (which writes back to the session).
- Frontend has NO test framework — verify via `typecheck` + `lint`; no new framework introduced.
- Backend tests use Vitest with `__tests__/` dirs colocated; run via `pnpm --filter @sekiro/api test`.
- All commands run from repo root `/Users/zero/projects/Sekiro` unless noted.
- DRY, YAGNI, TDD, frequent commits. Do NOT add comments to code unless asked.

---

## File Structure

### New files (backend)
- `apps/api/src/modules/auth/decorators/requires-permissions.decorator.ts` — `@RequiresPermissions(code)` decorator (Sets Reflector metadata).
- `apps/api/src/modules/auth/guards/permission.guard.ts` — `PermissionGuard` (reads metadata, super-admin bypass, O(1) permission check).
- `apps/api/src/modules/auth/guards/__tests__/permission.guard.spec.ts` — unit tests for the guard.

### New files (frontend)
- `apps/web/lib/hooks/use-permission.ts` — `usePermission()` hook (reads `useAuthStore`, super-admin bypass, `has`/`hasAny`).
- `apps/web/components/shared/has-permission.tsx` — `<HasPermission code>` wrapper (renders children or `null`).

### Modified files (backend)
- `packages/shared/src/constants.ts` — add `SUPER_ADMIN_ROLE`, expand `PERMISSIONS` to 28 codes.
- `apps/api/src/modules/menu/services/menu.service.ts` — relax permission regex in `validateTypeConstraints`.
- `apps/api/src/modules/auth/types.ts` — add `permissions` + `roles` to `Session`.
- `apps/api/src/modules/auth/providers/redis-session.provider.ts` — add `updateSession(sessionId, patch)` method.
- `apps/api/src/modules/auth/services/auth.service.ts` — login/loginWithMfa store perms+roles in session + return `user.roles`; `getMe` writes back to session (new `sessionId` param).
- `apps/api/src/modules/auth/auth.controller.ts` — pass `req.user?.sid` to `getMe`.
- `apps/api/src/modules/auth/guards/jwt-auth.guard.ts` — attach session `permissions`+`roles` to `req.user`.
- `apps/api/src/modules/auth/auth.module.ts` — register + export `PermissionGuard`.
- 7 controllers (`user`, `role`, `menu`, `dept`, `position` (in dept module), `dict`, `dict-item`) — add `PermissionGuard` to class `@UseGuards`, add `@RequiresPermissions` on 28 write methods.
- `apps/api/prisma/seed.ts` — add 25 button `Menu` rows + assign all 28 to roles 1 & 2.

### Modified files (frontend)
- `apps/web/app/(auth)/login/page.tsx` — `completeLogin` populates `roles` from response.
- 6 management pages — wrap write buttons with `<HasPermission>` / conditional render.

### Modified test files
- `apps/api/src/modules/menu/__tests__/menu.service.spec.ts` — regex tests.
- `apps/api/src/modules/auth/providers/__tests__/redis-session.provider.spec.ts` — `updateSession` tests + Session literal fix.
- `apps/api/src/modules/auth/services/__tests__/auth.service.spec.ts` — session perms/roles + getMe writeback tests.
- `apps/api/src/modules/auth/guards/__tests__/jwt-auth.guard.spec.ts` — attach-perms tests.

---

## Task 1: Shared constants — `SUPER_ADMIN_ROLE` + expand `PERMISSIONS`

**Files:**
- Modify: `packages/shared/src/constants.ts:27-40`

**Interfaces:**
- Produces: `SUPER_ADMIN_ROLE` constant (`'super_admin'`); `PERMISSIONS` expanded to 28 keys (consumed by backend guard/decorators and frontend hook/wrapper/pages).

- [ ] **Step 1: Edit `packages/shared/src/constants.ts`**

Replace the `PERMISSIONS` block (lines 27-40) and add `SUPER_ADMIN_ROLE` after `MENU_KEYS` (after line 21):

```typescript
export const PERMISSIONS = {
  USER_CREATE: "system:user:create",
  USER_UPDATE: "system:user:update",
  USER_DELETE: "system:user:delete",
  USER_RESET: "system:user:reset",
  USER_ASSIGN_ROLE: "system:user:assign-role",
  USER_ASSIGN_POSITION: "system:user:assign-position",
  USER_UPDATE_STATUS: "system:user:update-status",
  ROLE_CREATE: "system:role:create",
  ROLE_UPDATE: "system:role:update",
  ROLE_DELETE: "system:role:delete",
  ROLE_ASSIGN_PERMISSION: "system:role:assign-permission",
  ROLE_DATA_SCOPE: "system:role:data-scope",
  ROLE_UPDATE_STATUS: "system:role:update-status",
  MENU_CREATE: "system:menu:create",
  MENU_UPDATE: "system:menu:update",
  MENU_DELETE: "system:menu:delete",
  DEPT_CREATE: "system:dept:create",
  DEPT_UPDATE: "system:dept:update",
  DEPT_DELETE: "system:dept:delete",
  POSITION_CREATE: "system:position:create",
  POSITION_UPDATE: "system:position:update",
  POSITION_DELETE: "system:position:delete",
  DICT_CREATE: "system:dict:create",
  DICT_UPDATE: "system:dict:update",
  DICT_DELETE: "system:dict:delete",
  DICT_ITEM_CREATE: "system:dict-item:create",
  DICT_ITEM_UPDATE: "system:dict-item:update",
  DICT_ITEM_DELETE: "system:dict-item:delete",
} as const;
```

Add after the `MENU_KEYS` `as const;` closing (after line 21), before the `PERMISSIONS` doc comment:

```typescript
/**
 * 超级管理员角色编码（guard 与前端 hook 绕过权限判断时使用）
 */
export const SUPER_ADMIN_ROLE = "super_admin";
```

- [ ] **Step 2: Build the shared package**

Run: `pnpm --filter @sekiro/shared build`
Expected: compiles without error, emits `packages/shared/dist`.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/constants.ts packages/shared/dist
git commit -m "feat(shared): add SUPER_ADMIN_ROLE and expand PERMISSIONS to 28 button codes"
```

---

## Task 2: Relax menu permission regex (TDD)

**Files:**
- Modify: `apps/api/src/modules/menu/services/menu.service.ts:106`
- Test: `apps/api/src/modules/menu/__tests__/menu.service.spec.ts`

**Interfaces:**
- Produces: button-type `Menu.permission` accepts hyphenated segments (`assign-role`, `dict-item`, `update-status`).

- [ ] **Step 1: Write the failing tests**

In `apps/api/src/modules/menu/__tests__/menu.service.spec.ts`, after the existing `"创建按钮类型但 permission 格式错 抛出异常"` test (after line 57), add:

```typescript
  it("创建按钮类型 permission 含连字符应通过校验", async () => {
    repository.create.mockResolvedValue({ id: 1 });
    await expect(
      service.create({
        title: "分配角色",
        type: "button",
        permission: "system:user:assign-role",
      }),
    ).resolves.toBeDefined();
    expect(repository.create).toHaveBeenCalled();
  });

  it("创建按钮类型 permission 含 dict-item 应通过校验", async () => {
    repository.create.mockResolvedValue({ id: 1 });
    await expect(
      service.create({
        title: "新增字典项",
        type: "button",
        permission: "system:dict-item:create",
      }),
    ).resolves.toBeDefined();
  });

  it("创建按钮类型 permission 含 update-status 应通过校验", async () => {
    repository.create.mockResolvedValue({ id: 1 });
    await expect(
      service.create({
        title: "修改状态",
        type: "button",
        permission: "system:role:update-status",
      }),
    ).resolves.toBeDefined();
  });

  it("创建按钮类型 permission 首部连字符抛出异常", async () => {
    await expect(
      service.create({
        title: "非法",
        type: "button",
        permission: "system:-user:create",
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @sekiro/api test -- menu.service`
Expected: the three "应通过校验" tests FAIL (current regex rejects hyphens); the "首部连字符" test passes already.

- [ ] **Step 3: Relax the regex**

In `apps/api/src/modules/menu/services/menu.service.ts` line 106, replace:

```typescript
        if (!/^[a-z]+:[a-z]+:[a-z]+$/.test(data.permission)) {
```

with:

```typescript
        if (!/^[a-z]+(-[a-z]+)*(:[a-z]+(-[a-z]+)*){2}$/.test(data.permission)) {
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @sekiro/api test -- menu.service`
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/menu/services/menu.service.ts apps/api/src/modules/menu/__tests__/menu.service.spec.ts
git commit -m "feat(menu): relax permission identifier regex to allow hyphenated segments"
```

---

## Task 3: Extend `Session` interface with `permissions` + `roles`

**Files:**
- Modify: `apps/api/src/modules/auth/types.ts:40-51`
- Modify: `apps/api/src/modules/auth/providers/__tests__/redis-session.provider.spec.ts:21-32` (fix Session literal so typecheck passes)

**Interfaces:**
- Produces: `Session.permissions: string[]` and `Session.roles: string[]` (consumed by login, getMe, JwtAuthGuard, PermissionGuard).

- [ ] **Step 1: Add fields to `Session`**

In `apps/api/src/modules/auth/types.ts`, inside the `Session` interface (after line 50 `expiresAt: string;`), add:

```typescript
  permissions: string[];
  roles: string[];
```

- [ ] **Step 2: Update the existing Session literal in the provider spec**

In `apps/api/src/modules/auth/providers/__tests__/redis-session.provider.spec.ts`, the `createSession` test builds a `Session` (lines 21-32). Add the two new fields so the literal satisfies the interface. Replace the `const session: Session = { ... }` block with:

```typescript
      const session: Session = {
        userId: 1,
        username: "admin",
        token: "jwt.token",
        refreshToken: "refresh.token",
        remember: true,
        ip: "127.0.0.1",
        userAgent: "Mozilla/5.0",
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
        expiresAt: new Date().toISOString(),
        permissions: ["system:user:create"],
        roles: ["super_admin"],
      };
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm --filter @sekiro/api typecheck`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/auth/types.ts apps/api/src/modules/auth/providers/__tests__/redis-session.provider.spec.ts
git commit -m "feat(auth): add permissions and roles fields to Session interface"
```

---

## Task 4: `RedisSessionProvider.updateSession` method (TDD)

**Files:**
- Modify: `apps/api/src/modules/auth/providers/redis-session.provider.ts`
- Test: `apps/api/src/modules/auth/providers/__tests__/redis-session.provider.spec.ts`

**Interfaces:**
- Produces: `RedisSessionProvider.updateSession(sessionId: string, patch: Partial<Session>): Promise<void>` — merges patch into existing session, preserves TTL (mirrors `updateSessionToken`). Consumed by `AuthService.getMe`.

- [ ] **Step 1: Write the failing test**

In `apps/api/src/modules/auth/providers/__tests__/redis-session.provider.spec.ts`, add a new `describe("updateSession", ...)` block before the closing `});` of the top-level describe (after the `updateSessionToken` describe, before line 86 `});`):

```typescript
  describe("updateSession", () => {
    it("should merge patch into existing session and preserve TTL", async () => {
      const existing = {
        userId: 1,
        username: "admin",
        token: "jwt.token",
        refreshToken: "rt.token",
        remember: true,
        ip: "127.0.0.1",
        userAgent: "Mozilla/5.0",
        createdAt: "2026-01-01T00:00:00.000Z",
        lastActiveAt: "2026-01-01T00:00:00.000Z",
        expiresAt: "2026-01-31T00:00:00.000Z",
        permissions: [],
        roles: [],
      };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(existing));
      mockRedis.ttl.mockResolvedValueOnce(2000);

      await provider.updateSession("session-123", {
        permissions: ["system:user:create"],
        roles: ["admin"],
      });

      expect(mockRedis.setEx).toHaveBeenCalledWith(
        "sekiro:session:session-123",
        2000,
        expect.stringContaining('"permissions":["system:user:create"]'),
      );
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        "sekiro:session:session-123",
        2000,
        expect.stringContaining('"roles":["admin"]'),
      );
    });

    it("should do nothing if session does not exist", async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      await provider.updateSession("missing", { permissions: ["x"] });
      expect(mockRedis.setEx).not.toHaveBeenCalled();
    });
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @sekiro/api test -- redis-session.provider`
Expected: FAIL (`provider.updateSession is not a function`).

- [ ] **Step 3: Implement `updateSession`**

In `apps/api/src/modules/auth/providers/redis-session.provider.ts`, add this method after `updateSessionToken` (after line 41, before `deleteSession`):

```typescript
  async updateSession(
    sessionId: string,
    patch: Partial<Session>,
  ): Promise<void> {
    const key = `sekiro:session:${sessionId}`;
    const session = await this.getSession(sessionId);
    if (!session) {
      return;
    }
    const updated = { ...session, ...patch };
    const ttl = await this.redisClient.ttl(key);
    if (ttl > 0) {
      await this.redisClient.setEx(key, ttl, JSON.stringify(updated));
    }
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @sekiro/api test -- redis-session.provider`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/auth/providers/redis-session.provider.ts apps/api/src/modules/auth/providers/__tests__/redis-session.provider.spec.ts
git commit -m "feat(auth): add RedisSessionProvider.updateSession for partial session patching"
```

---

## Task 5: `@RequiresPermissions` decorator + `PermissionGuard` (TDD)

**Files:**
- Create: `apps/api/src/modules/auth/decorators/requires-permissions.decorator.ts`
- Create: `apps/api/src/modules/auth/guards/permission.guard.ts`
- Test: `apps/api/src/modules/auth/guards/__tests__/permission.guard.spec.ts`
- Modify: `apps/api/src/modules/auth/auth.module.ts`

**Interfaces:**
- Produces: `RequiresPermissions(code: string)` decorator; `PermissionGuard` (deps: `Reflector`) with `canActivate`. Reads metadata key `PERMISSIONS_KEY`. Reads `req.user.roles` (super-admin bypass via `SUPER_ADMIN_ROLE`) and `req.user.permissions` (Set includes). Throws `ForbiddenException({ code: 403, message: '无权限访问' })` on denial; `UnauthorizedException` if no `req.user`.

- [ ] **Step 1: Create the decorator**

Create `apps/api/src/modules/auth/decorators/requires-permissions.decorator.ts`:

```typescript
import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'requiresPermissions';

export const RequiresPermissions = (code: string) =>
  SetMetadata(PERMISSIONS_KEY, code);
```

- [ ] **Step 2: Write the failing guard tests**

Create `apps/api/src/modules/auth/guards/__tests__/permission.guard.spec.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PermissionGuard } from '../permission.guard';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PERMISSIONS, SUPER_ADMIN_ROLE } from '@sekiro/shared';

function createExecutionContext(user: any, handler: any) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => handler,
  } as any;
}

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let reflector: any;

  beforeEach(() => {
    reflector = { get: vi.fn() };
    guard = new PermissionGuard(reflector);
  });

  it('should allow when no @RequiresPermissions metadata', async () => {
    reflector.get.mockReturnValue(undefined);
    const result = await guard.canActivate(createExecutionContext({ sub: 1 }, () => {}));
    expect(result).toBe(true);
  });

  it('should allow super_admin bypass', async () => {
    reflector.get.mockReturnValue(PERMISSIONS.USER_CREATE);
    const result = await guard.canActivate(
      createExecutionContext({ sub: 1, roles: [SUPER_ADMIN_ROLE], permissions: [] }, () => {}),
    );
    expect(result).toBe(true);
  });

  it('should allow when user has the required permission', async () => {
    reflector.get.mockReturnValue(PERMISSIONS.USER_CREATE);
    const result = await guard.canActivate(
      createExecutionContext(
        { sub: 2, roles: ['admin'], permissions: ['system:user:create', 'system:user:delete'] },
        () => {},
      ),
    );
    expect(result).toBe(true);
  });

  it('should deny with ForbiddenException when permission missing', async () => {
    reflector.get.mockReturnValue(PERMISSIONS.USER_DELETE);
    await expect(
      guard.canActivate(
        createExecutionContext(
          { sub: 2, roles: ['admin'], permissions: ['system:user:create'] },
          () => {},
        ),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should deny when permissions array missing (treated as empty)', async () => {
    reflector.get.mockReturnValue(PERMISSIONS.USER_CREATE);
    await expect(
      guard.canActivate(
        createExecutionContext({ sub: 2, roles: ['admin'] }, () => {}),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw UnauthorizedException when req.user missing', async () => {
    reflector.get.mockReturnValue(PERMISSIONS.USER_CREATE);
    await expect(
      guard.canActivate(createExecutionContext(undefined, () => {})),
    ).rejects.toThrow(UnauthorizedException);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter @sekiro/api test -- permission.guard`
Expected: FAIL (`Cannot find module '../permission.guard'`).

- [ ] **Step 4: Implement the guard**

Create `apps/api/src/modules/auth/guards/permission.guard.ts`:

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SUPER_ADMIN_ROLE } from '@sekiro/shared';
import { PERMISSIONS_KEY } from '../decorators/requires-permissions.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.get<string>(PERMISSIONS_KEY, context.getHandler());
    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException({ code: 401, message: '未认证' });
    }

    const roles: string[] = user.roles ?? [];
    if (roles.includes(SUPER_ADMIN_ROLE)) {
      return true;
    }

    const permissions: string[] = user.permissions ?? [];
    if (!permissions.includes(required)) {
      throw new ForbiddenException({ code: 403, message: '无权限访问' });
    }
    return true;
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @sekiro/api test -- permission.guard`
Expected: all 6 tests PASS.

- [ ] **Step 6: Register + export `PermissionGuard` in `AuthModule`**

In `apps/api/src/modules/auth/auth.module.ts`:
- Add import: `import { PermissionGuard } from './guards/permission.guard';`
- Add `PermissionGuard,` to the `providers` array (after `JwtAuthGuard,`).
- Add `PermissionGuard,` to the `exports` array (after `JwtAuthGuard,`).

- [ ] **Step 7: Run typecheck + full test suite**

Run: `pnpm --filter @sekiro/api typecheck && pnpm --filter @sekiro/api test`
Expected: typecheck clean; all tests PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/auth/decorators/requires-permissions.decorator.ts apps/api/src/modules/auth/guards/permission.guard.ts apps/api/src/modules/auth/guards/__tests__/permission.guard.spec.ts apps/api/src/modules/auth/auth.module.ts
git commit -m "feat(auth): add @RequiresPermissions decorator and PermissionGuard"
```

---

## Task 6: Store permissions + roles in Session at login (TDD)

**Files:**
- Modify: `apps/api/src/modules/auth/services/auth.service.ts` (`login` lines 50-226, `loginWithMfa` lines 231-321)
- Test: `apps/api/src/modules/auth/services/__tests__/auth.service.spec.ts`

**Interfaces:**
- Consumes: `Session.permissions`/`roles` (Task 3), `getUserPermissions` (existing).
- Produces: login response `user.roles: string[]`; Redis Session created with `permissions` + `roles`.

- [ ] **Step 1: Write the failing tests**

In `apps/api/src/modules/auth/services/__tests__/auth.service.spec.ts`, inside the `describe("login", ...)` block (starts at line 78), append this test before the block's closing `});`. It asserts the session stored at login includes permissions and roles, and the response `user` includes `roles`:

```typescript
    it("登录成功应在 Session 中写入 permissions 与 roles，并在响应 user 中返回 roles", async () => {
      prismaService.user.findUnique.mockResolvedValueOnce({
        id: 2,
        username: "admin",
        passwordHash: "$2a$10$hash",
        status: "enabled",
        mfaEnabled: false,
        nickname: "Admin",
        email: null,
        phone: null,
        avatar: null,
        deptId: 1,
        roles: [{ role: { code: "admin" } }],
      });
      (bcrypt.compare as any).mockResolvedValueOnce(true);
      prismaService.userRole.findMany.mockResolvedValueOnce([{ roleId: 2 }]);
      prismaService.roleMenu.findMany.mockResolvedValueOnce([{ menuId: 211 }]);
      prismaService.menu.findMany.mockResolvedValueOnce([
        { permission: "system:user:create" },
      ]);

      const result = await service.login(
        { username: "admin", password: "md5hash" } as any,
        "127.0.0.1",
        "Mozilla/5.0",
      );

      expect(redisSessionProvider.createSession).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          permissions: ["system:user:create"],
          roles: ["admin"],
        }),
        2592000,
      );
      expect(result.data.user.roles).toEqual(["admin"]);
    });
```

Add an equivalent assertion for `loginWithMfa` inside `describe("loginWithMfa", ...)`:

```typescript
    it("MFA 登录成功应在 Session 中写入 permissions 与 roles，并在响应 user 中返回 roles", async () => {
      mfaService.verifyLogin.mockResolvedValueOnce({
        code: 0,
        data: {
          user: {
            id: 2,
            username: "admin",
            nickname: "Admin",
            email: null,
            phone: null,
            avatar: null,
            status: "enabled",
            deptId: 1,
            roles: [{ role: { code: "admin" } }],
          },
          payload: { remember: false },
        },
      });
      prismaService.userRole.findMany.mockResolvedValueOnce([{ roleId: 2 }]);
      prismaService.roleMenu.findMany.mockResolvedValueOnce([{ menuId: 211 }]);
      prismaService.menu.findMany.mockResolvedValueOnce([
        { permission: "system:user:create" },
      ]);

      const result = await service.loginWithMfa("mfa.token", "123456", "127.0.0.1", "Mozilla/5.0");

      expect(redisSessionProvider.createSession).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          permissions: ["system:user:create"],
          roles: ["admin"],
        }),
        2592000,
      );
      expect(result.data.user.roles).toEqual(["admin"]);
    });
```

Note: ensure the `prismaService.user.findUnique` mock in the existing `beforeEach` is unchanged; these tests use `mockResolvedValueOnce` to override per-test.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @sekiro/api test -- auth.service`
Expected: the two new tests FAIL (session lacks `permissions`/`roles`; `user.roles` undefined).

- [ ] **Step 3: Update `login` to include roles in the user query**

In `apps/api/src/modules/auth/services/auth.service.ts`, change the `login` user query (lines 58-60) to include roles:

```typescript
    const user = await this.prismaService.user.findUnique({
      where: { username },
      include: {
        roles: { include: { role: true } },
      },
    });
```

- [ ] **Step 4: Compute roles + store in session + return in response (login)**

In `login`, after `const menus = await this.buildMenuTree(user.id);` (line 156), add:

```typescript
    const roles = user.roles.map((ur) => ur.role.code);
```

In the `const session = { ... }` object (lines 173-184), add two fields before the closing `};`:

```typescript
      permissions,
      roles,
```

In the response `user: { ... }` object (lines 212-221), add `roles,` after `deptId: user.deptId,`:

```typescript
          deptId: user.deptId,
          roles,
```

- [ ] **Step 5: Apply the same changes to `loginWithMfa`**

The `loginWithMfa` user object comes from `verifyResult.data.user` (already includes `roles` if `MfaService.verifyLogin` loads them — verify by checking the mock returns `roles: [{ role: { code: "admin" } }]`; the real `mfaService.verifyLogin` must also include roles). After `const menus = await this.buildMenuTree(user.id);` (line 253), add:

```typescript
    const roles = user.roles.map((ur) => ur.role.code);
```

In the `loginWithMfa` `const session = { ... }` object (lines 270-281), add:

```typescript
      permissions,
      roles,
```

In the `loginWithMfa` response `user: { ... }` object (lines 307-316), add `roles,` after `deptId: user.deptId,`:

```typescript
          deptId: user.deptId,
          roles,
```

`MfaService.verifyLogin` currently fetches the user without `roles` (`apps/api/src/modules/auth/services/mfa.service.ts` line 120-122: `findUnique({ where: { id: payload.sub } })`). Update it to include roles so `user.roles` is available to `loginWithMfa`:

```typescript
    const user = await this.prismaService.user.findUnique({
      where: { id: payload.sub },
      include: {
        roles: { include: { role: true } },
      },
    });
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm --filter @sekiro/api test -- auth.service`
Expected: all tests PASS (including the two new ones).

- [ ] **Step 7: Run full backend test suite + typecheck**

Run: `pnpm --filter @sekiro/api typecheck && pnpm --filter @sekiro/api test`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/auth/services/auth.service.ts apps/api/src/modules/auth/services/__tests__/auth.service.spec.ts apps/api/src/modules/auth/services/mfa.service.ts
git commit -m "feat(auth): store permissions and roles in session at login and return user.roles"
```

---

## Task 7: `/auth/me` writes permissions + roles back to Session (TDD)

**Files:**
- Modify: `apps/api/src/modules/auth/services/auth.service.ts` (`getMe` lines 357-396)
- Modify: `apps/api/src/modules/auth/auth.controller.ts:112`
- Test: `apps/api/src/modules/auth/services/__tests__/auth.service.spec.ts`

**Interfaces:**
- Consumes: `RedisSessionProvider.updateSession` (Task 4).
- Produces: `AuthService.getMe(userId, sessionId?)` — writes recomputed `permissions`+`roles` to the session when `sessionId` is provided.

- [ ] **Step 1: Add `getSession`/`updateSession` to the test mock**

In `apps/api/src/modules/auth/services/__tests__/auth.service.spec.ts` `beforeEach`, the `redisSessionProvider` mock (lines 51-54) currently has only `createSession`/`deleteSession`. Replace it with:

```typescript
    redisSessionProvider = {
      createSession: vi.fn(),
      deleteSession: vi.fn(),
      getSession: vi.fn(),
      updateSession: vi.fn(),
    };
```

- [ ] **Step 2: Write the failing test**

Inside `describe("getMe", ...)`, add:

```typescript
    it("getMe 应将重算的 permissions 与 roles 回写到 Session", async () => {
      prismaService.user.findUnique.mockResolvedValueOnce({
        id: 2,
        username: "admin",
        nickname: "Admin",
        avatar: null,
        email: null,
        phone: null,
        mfaEnabled: false,
        roles: [{ role: { code: "admin" } }],
      });
      prismaService.userRole.findMany.mockResolvedValueOnce([{ roleId: 2 }]);
      prismaService.roleMenu.findMany.mockResolvedValueOnce([{ menuId: 211 }]);
      prismaService.menu.findMany.mockResolvedValueOnce([
        { permission: "system:user:create" },
      ]);

      await service.getMe(2, "session-123");

      expect(redisSessionProvider.updateSession).toHaveBeenCalledWith("session-123", {
        permissions: ["system:user:create"],
        roles: ["admin"],
      });
    });
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm --filter @sekiro/api test -- auth.service`
Expected: the new test FAILS (`updateSession` not called).

- [ ] **Step 4: Update `getMe` signature + writeback**

In `apps/api/src/modules/auth/services/auth.service.ts`, change the `getMe` signature (line 357) to accept `sessionId`:

```typescript
  async getMe(
    userId: number,
    sessionId?: string,
  ): Promise<{
    user: CurrentUser;
    permissions: string[];
    menus: MenuNode[];
  }> {
```

After `const roles = user.roles.map((ur) => ur.role.code);` (line 379) and before the `return {` (line 381), add:

```typescript
    if (sessionId) {
      await this.redisSessionProvider.updateSession(sessionId, { permissions, roles });
    }
```

- [ ] **Step 5: Pass `sessionId` from the controller**

In `apps/api/src/modules/auth/auth.controller.ts` line 112, change:

```typescript
    const result = await this.authService.getMe(req.user.sub);
```

to:

```typescript
    const result = await this.authService.getMe(req.user.sub, req.user?.sid);
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm --filter @sekiro/api typecheck && pnpm --filter @sekiro/api test`
Expected: clean; all PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/auth/services/auth.service.ts apps/api/src/modules/auth/auth.controller.ts apps/api/src/modules/auth/services/__tests__/auth.service.spec.ts
git commit -m "feat(auth): write refreshed permissions and roles back to session on /auth/me"
```

---

## Task 8: `JwtAuthGuard` attaches session permissions + roles to `req.user` (TDD)

**Files:**
- Modify: `apps/api/src/modules/auth/guards/jwt-auth.guard.ts`
- Test: `apps/api/src/modules/auth/guards/__tests__/jwt-auth.guard.spec.ts`

**Interfaces:**
- Produces: `req.user` carries `permissions: string[]` and `roles: string[]` (real role codes) sourced from the Redis session. Consumed by `PermissionGuard`.

- [ ] **Step 1: Write the failing test**

In `apps/api/src/modules/auth/guards/__tests__/jwt-auth.guard.spec.ts`, the existing `createExecutionContext` only returns `{ headers }`. Update it to also carry a mutable `user` so the guard can assign to it. Replace the `createExecutionContext` function (lines 5-11) with:

```typescript
function createExecutionContext(headers: Record<string, string>) {
  const request: any = { headers };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as any;
}
```

Add a new test inside `describe('JwtAuthGuard', ...)` (after the existing tests):

```typescript
  it('should attach session permissions and roles to req.user', async () => {
    jwtProvider.verifyToken.mockReturnValueOnce({
      sub: 1,
      username: 'admin',
      roles: ['system'],
      sid: 'session-1',
    });
    redisSessionProvider.getSession.mockResolvedValueOnce({
      permissions: ['system:user:create'],
      roles: ['super_admin'],
    });

    const ctx = createExecutionContext({ authorization: 'Bearer access.token' });
    await guard.canActivate(ctx);

    const req = ctx.switchToHttp().getRequest();
    expect(req.user.permissions).toEqual(['system:user:create']);
    expect(req.user.roles).toEqual(['super_admin']);
  });

  it('should default permissions/roles to empty when session lacks them', async () => {
    jwtProvider.verifyToken.mockReturnValueOnce({
      sub: 1,
      username: 'admin',
      sid: 'session-1',
    });
    redisSessionProvider.getSession.mockResolvedValueOnce({});

    const ctx = createExecutionContext({ authorization: 'Bearer access.token' });
    await guard.canActivate(ctx);

    const req = ctx.switchToHttp().getRequest();
    expect(req.user.permissions).toEqual([]);
    expect(req.user.roles).toEqual([]);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @sekiro/api test -- jwt-auth.guard`
Expected: the two new tests FAIL (`req.user.permissions` is undefined).

- [ ] **Step 3: Update the guard to attach session data**

In `apps/api/src/modules/auth/guards/jwt-auth.guard.ts`, replace the session-check block (lines 37-44):

```typescript
    if (payload.sid) {
      const session = await this.redisSessionProvider.getSession(payload.sid);
      if (!session) {
        throw new UnauthorizedException({ code: 401, message: '会话已失效' });
      }
    }

    request.user = payload;
    return true;
```

with:

```typescript
    let permissions: string[] = [];
    let roles: string[] = [];
    if (payload.sid) {
      const session = await this.redisSessionProvider.getSession(payload.sid);
      if (!session) {
        throw new UnauthorizedException({ code: 401, message: '会话已失效' });
      }
      permissions = session.permissions ?? [];
      roles = session.roles ?? [];
    }

    request.user = { ...payload, permissions, roles };
    return true;
```

Note: `roles` here overrides the JWT `payload.roles` (which was the module-prefix hack) with the real role codes from the session — intended, since `req.user.roles` is now the source of truth for the super-admin bypass.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @sekiro/api typecheck && pnpm --filter @sekiro/api test`
Expected: clean; all PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/auth/guards/jwt-auth.guard.ts apps/api/src/modules/auth/guards/__tests__/jwt-auth.guard.spec.ts
git commit -m "feat(auth): attach session permissions and roles to req.user in JwtAuthGuard"
```

---

## Task 9: Decorate the 7 system controllers with `PermissionGuard` + `@RequiresPermissions`

**Files:**
- Modify: `apps/api/src/modules/user/user.controller.ts`
- Modify: `apps/api/src/modules/role/role.controller.ts`
- Modify: `apps/api/src/modules/menu/menu.controller.ts`
- Modify: `apps/api/src/modules/dept/dept.controller.ts`
- Modify: `apps/api/src/modules/dept/position.controller.ts`
- Modify: `apps/api/src/modules/dict/dict.controller.ts`
- Modify: `apps/api/src/modules/dict/dict-item.controller.ts`

**Interfaces:**
- Consumes: `PermissionGuard` (Task 5), `RequiresPermissions` decorator (Task 5), `PERMISSIONS` (Task 1).
- Produces: 28 write endpoints enforce their permission code; GET endpoints pass through (no metadata).

This task is mechanical wiring (no unit test); verification = typecheck + the guard unit tests already cover behavior.

- [ ] **Step 1: `user.controller.ts`**

Add imports at top (with the other auth imports):

```typescript
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequiresPermissions } from '../auth/decorators/requires-permissions.decorator';
import { PERMISSIONS } from '@sekiro/shared';
```

Change class decorator (line 28) from `@UseGuards(JwtAuthGuard)` to:

```typescript
@UseGuards(JwtAuthGuard, PermissionGuard)
```

Add `@RequiresPermissions(...)` directly above each decorated write method's existing decorators (place it as the first decorator on the method, above `@Put`/`@Post`/`@Delete`):

| Method | Decorator to add |
|---|---|
| `create` (POST) | `@RequiresPermissions(PERMISSIONS.USER_CREATE)` |
| `update` (PUT :id) | `@RequiresPermissions(PERMISSIONS.USER_UPDATE)` |
| `delete` (DELETE :id) | `@RequiresPermissions(PERMISSIONS.USER_DELETE)` |
| `updateStatus` (PUT :id/status) | `@RequiresPermissions(PERMISSIONS.USER_UPDATE_STATUS)` |
| `resetPassword` (PUT :id/reset-password) | `@RequiresPermissions(PERMISSIONS.USER_RESET)` |
| `assignRoles` (PUT :id/roles) | `@RequiresPermissions(PERMISSIONS.USER_ASSIGN_ROLE)` |
| `assignPositions` (PUT :id/positions) | `@RequiresPermissions(PERMISSIONS.USER_ASSIGN_POSITION)` |

Leave `updateProfile` and `changePassword` **undecorated** (self-service).

- [ ] **Step 2: `role.controller.ts`**

Add the same three imports. Change class `@UseGuards(JwtAuthGuard)` → `@UseGuards(JwtAuthGuard, PermissionGuard)`. Decorate:

| Method | Decorator |
|---|---|
| `create` | `@RequiresPermissions(PERMISSIONS.ROLE_CREATE)` |
| `update` | `@RequiresPermissions(PERMISSIONS.ROLE_UPDATE)` |
| `delete` | `@RequiresPermissions(PERMISSIONS.ROLE_DELETE)` |
| `updateStatus` | `@RequiresPermissions(PERMISSIONS.ROLE_UPDATE_STATUS)` |
| `assignMenus` | `@RequiresPermissions(PERMISSIONS.ROLE_ASSIGN_PERMISSION)` |
| `setDataScope` | `@RequiresPermissions(PERMISSIONS.ROLE_DATA_SCOPE)` |

- [ ] **Step 3: `menu.controller.ts`**

Imports + class guard change. Decorate `create`→`MENU_CREATE`, `update`→`MENU_UPDATE`, `delete`→`MENU_DELETE`.

- [ ] **Step 4: `dept.controller.ts`**

Imports + class guard change. Decorate `create`→`DEPT_CREATE`, `update`→`DEPT_UPDATE`, `delete`→`DEPT_DELETE`.

- [ ] **Step 5: `position.controller.ts`**

Imports + class guard change. Decorate `create`→`POSITION_CREATE`, `update`→`POSITION_UPDATE`, `delete`→`POSITION_DELETE`.

- [ ] **Step 6: `dict.controller.ts`**

Imports + class guard change. Decorate `create`→`DICT_CREATE`, `update`→`DICT_UPDATE`, `delete`→`DICT_DELETE`.

- [ ] **Step 7: `dict-item.controller.ts`**

Imports + class guard change. Decorate `create`→`DICT_ITEM_CREATE`, `update`→`DICT_ITEM_UPDATE`, `delete`→`DICT_ITEM_DELETE`.

- [ ] **Step 8: Run typecheck + full test suite**

Run: `pnpm --filter @sekiro/api typecheck && pnpm --filter @sekiro/api test`
Expected: clean; all PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/modules/user/user.controller.ts apps/api/src/modules/role/role.controller.ts apps/api/src/modules/menu/menu.controller.ts apps/api/src/modules/dept/dept.controller.ts apps/api/src/modules/dept/position.controller.ts apps/api/src/modules/dict/dict.controller.ts apps/api/src/modules/dict/dict-item.controller.ts
git commit -m "feat(api): enforce button-level permissions on all system write endpoints"
```

---

## Task 10: Seed 25 new button menus + role-menu assignments

**Files:**
- Modify: `apps/api/prisma/seed.ts`

**Interfaces:**
- Produces: 28 button-type `Menu` rows total (3 existing + 25 new) with correct `parentId`; `RoleMenu` grants for roles 1 (super_admin) and 2 (admin) covering all 28 button ids.

- [ ] **Step 1: Add the 25 new button `Menu` entries**

In `apps/api/prisma/seed.ts`, inside the `menuData` array, after the existing button 213 block (after line 330), add these 25 entries. The parent menu-node ids are confirmed from `menuData`: 21=用户管理(user), 22=角色管理(role), 23=菜单管理(menu), 24=部门管理(dept), 25=岗位管理(position), 26=数据字典(dict). Dict-item buttons (271-273) are also children of 26 (dict page manages both).

```typescript
      // ===== User 按钮补充 =====
      { id: 214, title: "重置密码", type: "button" as const, permission: "system:user:reset", sort: 4, status: "enabled" as const, parentId: 21 },
      { id: 215, title: "分配角色", type: "button" as const, permission: "system:user:assign-role", sort: 5, status: "enabled" as const, parentId: 21 },
      { id: 216, title: "分配岗位", type: "button" as const, permission: "system:user:assign-position", sort: 6, status: "enabled" as const, parentId: 21 },
      { id: 217, title: "修改状态", type: "button" as const, permission: "system:user:update-status", sort: 7, status: "enabled" as const, parentId: 21 },
      // ===== Role 按钮 =====
      { id: 221, title: "新增", type: "button" as const, permission: "system:role:create", sort: 1, status: "enabled" as const, parentId: 22 },
      { id: 222, title: "编辑", type: "button" as const, permission: "system:role:update", sort: 2, status: "enabled" as const, parentId: 22 },
      { id: 223, title: "删除", type: "button" as const, permission: "system:role:delete", sort: 3, status: "enabled" as const, parentId: 22 },
      { id: 224, title: "权限分配", type: "button" as const, permission: "system:role:assign-permission", sort: 4, status: "enabled" as const, parentId: 22 },
      { id: 225, title: "数据权限", type: "button" as const, permission: "system:role:data-scope", sort: 5, status: "enabled" as const, parentId: 22 },
      { id: 226, title: "修改状态", type: "button" as const, permission: "system:role:update-status", sort: 6, status: "enabled" as const, parentId: 22 },
      // ===== Menu 按钮 =====
      { id: 231, title: "新增", type: "button" as const, permission: "system:menu:create", sort: 1, status: "enabled" as const, parentId: 23 },
      { id: 232, title: "编辑", type: "button" as const, permission: "system:menu:update", sort: 2, status: "enabled" as const, parentId: 23 },
      { id: 233, title: "删除", type: "button" as const, permission: "system:menu:delete", sort: 3, status: "enabled" as const, parentId: 23 },
      // ===== Dept 按钮 =====
      { id: 241, title: "新增", type: "button" as const, permission: "system:dept:create", sort: 1, status: "enabled" as const, parentId: 24 },
      { id: 242, title: "编辑", type: "button" as const, permission: "system:dept:update", sort: 2, status: "enabled" as const, parentId: 24 },
      { id: 243, title: "删除", type: "button" as const, permission: "system:dept:delete", sort: 3, status: "enabled" as const, parentId: 24 },
      // ===== Position 按钮 =====
      { id: 251, title: "新增", type: "button" as const, permission: "system:position:create", sort: 1, status: "enabled" as const, parentId: 25 },
      { id: 252, title: "编辑", type: "button" as const, permission: "system:position:update", sort: 2, status: "enabled" as const, parentId: 25 },
      { id: 253, title: "删除", type: "button" as const, permission: "system:position:delete", sort: 3, status: "enabled" as const, parentId: 25 },
      // ===== Dict 按钮 =====
      { id: 261, title: "新增", type: "button" as const, permission: "system:dict:create", sort: 1, status: "enabled" as const, parentId: 26 },
      { id: 262, title: "编辑", type: "button" as const, permission: "system:dict:update", sort: 2, status: "enabled" as const, parentId: 26 },
      { id: 263, title: "删除", type: "button" as const, permission: "system:dict:delete", sort: 3, status: "enabled" as const, parentId: 26 },
      // ===== DictItem 按钮 =====
      { id: 271, title: "新增字典项", type: "button" as const, permission: "system:dict-item:create", sort: 1, status: "enabled" as const, parentId: 26 },
      { id: 272, title: "编辑字典项", type: "button" as const, permission: "system:dict-item:update", sort: 2, status: "enabled" as const, parentId: 26 },
      { id: 273, title: "删除字典项", type: "button" as const, permission: "system:dict-item:delete", sort: 3, status: "enabled" as const, parentId: 26 },
```

- [ ] **Step 2: Update the role-menu mappings**

In `apps/api/prisma/seed.ts`, update the `roleMenuMappings` (lines 1071-1092). Replace the entries for roles 1 and 2 with the full button set. The complete button id list is: `211, 212, 213, 214, 215, 216, 217, 221, 222, 223, 224, 225, 226, 231, 232, 233, 241, 242, 243, 251, 252, 253, 261, 262, 263, 271, 272, 273` (28 buttons).

Update role 1 (super_admin) — append all new button ids to its existing list (keep all existing menu ids):

```typescript
      1: [1, 2, 21, 211, 212, 213, 214, 215, 216, 217, 22, 221, 222, 223, 224, 225, 226, 23, 231, 232, 233, 24, 241, 242, 243, 25, 251, 252, 253, 26, 261, 262, 263, 271, 272, 273, 3, 31, 32, 33, 34],
```

Update role 2 (admin) — append all new button ids (keep its existing menu ids, no monitor):

```typescript
      2: [1, 2, 21, 211, 212, 213, 214, 215, 216, 217, 22, 221, 222, 223, 224, 225, 226, 23, 231, 232, 233, 24, 241, 242, 243, 25, 251, 252, 253, 26, 261, 262, 263, 271, 272, 273],
```

Leave roles 3-7 unchanged.

- [ ] **Step 3: Update the menu-count log line**

Update the log string at line 1014 from `共 16 条` to `共 41 条` (16 existing + 25 new) to keep the log accurate.

- [ ] **Step 4: Run the seed against a dev database**

Run: `pnpm --filter @sekiro/api exec prisma db seed`
Expected: seed completes without unique-constraint errors; logs show 41 menus and the role-menu count increased by the new grants.

- [ ] **Step 5: Verify the buttons landed (optional query)**

Run: `pnpm --filter @sekiro/api exec prisma studio` (or a quick `psql` query) — confirm 28 `type='button'` menus exist and role 2 has 36 role-menu rows (11 original + 25 new buttons; buttons 211/212/213 were already assigned to role 2).

- [ ] **Step 6: Commit**

```bash
git add apps/api/prisma/seed.ts
git commit -m "feat(seed): add 25 button permission menus and grant all 28 to super_admin/admin"
```

---

## Task 11: Frontend foundation — `usePermission` hook + `<HasPermission>` + `completeLogin` roles fix

**Files:**
- Create: `apps/web/lib/hooks/use-permission.ts`
- Create: `apps/web/components/shared/has-permission.tsx`
- Modify: `apps/web/app/(auth)/login/page.tsx:87`

**Interfaces:**
- Produces: `usePermission()` → `{ isSuperAdmin, has(code), hasAny(codes[]) }`; `<HasPermission code>` wrapper; login populates `CurrentUser.roles`.

- [ ] **Step 1: Create the `usePermission` hook**

Create `apps/web/lib/hooks/use-permission.ts`:

```typescript
import { useAuthStore } from "@/lib/store/auth-store";
import { SUPER_ADMIN_ROLE } from "@sekiro/shared";

export function usePermission() {
  const permissions = useAuthStore((s) => s.permissions);
  const roles = useAuthStore((s) => s.user?.roles ?? []);
  const isSuperAdmin = roles.includes(SUPER_ADMIN_ROLE);
  return {
    isSuperAdmin,
    has: (code: string) => isSuperAdmin || permissions.includes(code),
    hasAny: (codes: string[]) => isSuperAdmin || codes.some((c) => permissions.includes(c)),
  };
}
```

- [ ] **Step 2: Create the `<HasPermission>` wrapper**

Create `apps/web/components/shared/has-permission.tsx`:

```tsx
import * as React from "react";
import { usePermission } from "@/lib/hooks/use-permission";

export function HasPermission({
  code,
  children,
}: {
  code: string;
  children: React.ReactNode;
}) {
  const { has } = usePermission();
  return has(code) ? <>{children}</> : null;
}
```

- [ ] **Step 3: Fix `completeLogin` to populate roles**

In `apps/web/app/(auth)/login/page.tsx`, line 87, change `roles: [],` to:

```typescript
      roles: data.user?.roles ?? [],
```

- [ ] **Step 4: Run typecheck + lint**

Run: `pnpm --filter @sekiro/web typecheck && pnpm --filter @sekiro/web lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/hooks/use-permission.ts apps/web/components/shared/has-permission.tsx apps/web/app/\(auth\)/login/page.tsx
git commit -m "feat(web): add usePermission hook, HasPermission wrapper, and populate roles on login"
```

---

## Task 12: Gate User page buttons

**Files:**
- Modify: `apps/web/app/(dashboard)/system/user/page.tsx`

- [ ] **Step 1: Add imports**

At the top of `apps/web/app/(dashboard)/system/user/page.tsx`, add with the other imports:

```typescript
import { HasPermission } from "@/components/shared/has-permission";
import { usePermission } from "@/lib/hooks/use-permission";
import { PERMISSIONS } from "@sekiro/shared";
```

- [ ] **Step 2: Call `usePermission` in the component body**

Inside the page component function (near the top, alongside other hooks like `useTranslation`), add:

```typescript
  const { hasAny } = usePermission();
```

- [ ] **Step 3: Wrap the header "新增" button**

In the `PageHeader` (lines 319-327), wrap the create `<Button>` with `<HasPermission>`:

```tsx
        <HasPermission code={PERMISSIONS.USER_CREATE}>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            {t("system.user.createUser")}
          </Button>
        </HasPermission>
```

Leave the 导入/导出 buttons unwrapped (out of scope).

- [ ] **Step 4: Wrap the row "编辑" button**

In the actions column render (lines 266-277), wrap the edit `<Button>`:

```tsx
          <HasPermission code={PERMISSIONS.USER_UPDATE}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-primary"
              onClick={() => {
                setEditing(row);
                setFormOpen(true);
              }}
            >
              <Edit2 className="h-3.5 w-3.5" />
              {t("common.edit")}
            </Button>
          </HasPermission>
```

- [ ] **Step 5: Conditionally render the dropdown + wrap its items**

Replace the `<DropdownMenu>...</DropdownMenu>` block (lines 278-302) with a version that (a) only renders when `hasAny([PERMISSIONS.USER_RESET, PERMISSIONS.USER_ASSIGN_ROLE, PERMISSIONS.USER_DELETE])`, and (b) wraps each `DropdownMenuItem` in `<HasPermission>`:

```tsx
          {hasAny([PERMISSIONS.USER_RESET, PERMISSIONS.USER_ASSIGN_ROLE, PERMISSIONS.USER_DELETE]) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <HasPermission code={PERMISSIONS.USER_RESET}>
                  <DropdownMenuItem onClick={() => setResetTarget(row)}>
                    <KeyRound className="h-4 w-4" />
                    {t("system.user.resetPassword")}
                  </DropdownMenuItem>
                </HasPermission>
                <HasPermission code={PERMISSIONS.USER_ASSIGN_ROLE}>
                  <DropdownMenuItem onClick={() => openAssignRoles(row)}>
                    <ShieldCheck className="h-4 w-4" />
                    {t("system.user.assignRoles")}
                  </DropdownMenuItem>
                </HasPermission>
                <DropdownMenuSeparator />
                <HasPermission code={PERMISSIONS.USER_DELETE}>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDelId(row.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("common.delete")}
                  </DropdownMenuItem>
                </HasPermission>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
```

- [ ] **Step 6: Run typecheck + lint**

Run: `pnpm --filter @sekiro/web typecheck && pnpm --filter @sekiro/web lint`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add "apps/web/app/(dashboard)/system/user/page.tsx"
git commit -m "feat(web): permission-gate User management page write buttons"
```

---

## Task 13: Gate Role page buttons

**Files:**
- Modify: `apps/web/app/(dashboard)/system/role/page.tsx`

- [ ] **Step 1: Add imports**

```typescript
import { HasPermission } from "@/components/shared/has-permission";
import { PERMISSIONS } from "@sekiro/shared";
```

- [ ] **Step 2: Wrap the header "新增" button (lines 240-243)**

```tsx
      <HasPermission code={PERMISSIONS.ROLE_CREATE}>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" />
          {t("system.role.createRole")}
        </Button>
      </HasPermission>
```

- [ ] **Step 3: Wrap the row action buttons (lines 202-231)**

```tsx
          <HasPermission code={PERMISSIONS.ROLE_UPDATE}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-primary"
              onClick={() => {
                setEditing(r);
                setFormOpen(true);
              }}
            >
              <Edit2 className="h-3.5 w-3.5" />
              {t("common.edit")}
            </Button>
          </HasPermission>
          <HasPermission code={PERMISSIONS.ROLE_ASSIGN_PERMISSION}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-purple-600"
              onClick={() => openPerm(r)}
            >
              <Settings2 className="h-3.5 w-3.5" />
              {t("system.role.permission")}
            </Button>
          </HasPermission>
          <HasPermission code={PERMISSIONS.ROLE_DELETE}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => setDelId(r.id)}
              disabled={r.id === 1}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </HasPermission>
```

- [ ] **Step 4: Run typecheck + lint**

Run: `pnpm --filter @sekiro/web typecheck && pnpm --filter @sekiro/web lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(dashboard)/system/role/page.tsx"
git commit -m "feat(web): permission-gate Role management page write buttons"
```

---

## Task 14: Gate Menu page buttons

**Files:**
- Modify: `apps/web/app/(dashboard)/system/menu/page.tsx`

- [ ] **Step 1: Add imports**

```typescript
import { HasPermission } from "@/components/shared/has-permission";
import { PERMISSIONS } from "@sekiro/shared";
```

- [ ] **Step 2: Wrap the header "新增" button (lines 199-202)**

```tsx
      <HasPermission code={PERMISSIONS.MENU_CREATE}>
        <Button onClick={() => { setEditing(null); setParentId(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" />
          {t("system.menu.createMenu")}
        </Button>
      </HasPermission>
```

- [ ] **Step 3: Wrap the row action buttons (lines 155-190)**

Wrap the "新增子" button (inside `row.type !== "button"`) with `MENU_CREATE`, the edit button with `MENU_UPDATE`, and the delete button with `MENU_DELETE`:

```tsx
          {row.type !== "button" && (
            <HasPermission code={PERMISSIONS.MENU_CREATE}>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-primary"
                onClick={() => {
                  setEditing(null);
                  setParentId(row.id);
                  setFormOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("common.create")}
              </Button>
            </HasPermission>
          )}
          <HasPermission code={PERMISSIONS.MENU_UPDATE}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-primary"
              onClick={() => {
                setEditing(row);
                setParentId(findParentId(menus, row.id));
                setFormOpen(true);
              }}
            >
              <Edit2 className="h-3.5 w-3.5" />
              {t("common.edit")}
            </Button>
          </HasPermission>
          <HasPermission code={PERMISSIONS.MENU_DELETE}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => setDelId(row.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </HasPermission>
```

- [ ] **Step 4: Run typecheck + lint**

Run: `pnpm --filter @sekiro/web typecheck && pnpm --filter @sekiro/web lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(dashboard)/system/menu/page.tsx"
git commit -m "feat(web): permission-gate Menu management page write buttons"
```

---

## Task 15: Gate Dept page buttons

**Files:**
- Modify: `apps/web/app/(dashboard)/system/dept/page.tsx`

- [ ] **Step 1: Add imports**

```typescript
import { HasPermission } from "@/components/shared/has-permission";
import { PERMISSIONS } from "@sekiro/shared";
```

- [ ] **Step 2: Wrap the header "新增" button (lines 180-183)**

```tsx
      <HasPermission code={PERMISSIONS.DEPT_CREATE}>
        <Button onClick={() => { setEditing(null); setParentId(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" />
          {t("system.dept.createDept")}
        </Button>
      </HasPermission>
```

- [ ] **Step 3: Wrap the row action buttons (lines 146-171)**

```tsx
          <HasPermission code={PERMISSIONS.DEPT_CREATE}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-primary"
              onClick={() => { setEditing(null); setParentId(row.id); setFormOpen(true); }}
            >
              <Plus className="h-3.5 w-3.5" />
              {t("common.create")}
            </Button>
          </HasPermission>
          <HasPermission code={PERMISSIONS.DEPT_UPDATE}>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-primary"
              onClick={() => { setEditing(row); setParentId(findParentId(depts, row.id)); setFormOpen(true); }}
            >
              <Edit2 className="h-3.5 w-3.5" />
              {t("common.edit")}
            </Button>
          </HasPermission>
          <HasPermission code={PERMISSIONS.DEPT_DELETE}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => setDelId(row.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </HasPermission>
```

- [ ] **Step 4: Run typecheck + lint**

Run: `pnpm --filter @sekiro/web typecheck && pnpm --filter @sekiro/web lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(dashboard)/system/dept/page.tsx"
git commit -m "feat(web): permission-gate Dept management page write buttons"
```

---

## Task 16: Gate Position page buttons

**Files:**
- Modify: `apps/web/app/(dashboard)/system/position/page.tsx`

- [ ] **Step 1: Add imports**

```typescript
import { HasPermission } from "@/components/shared/has-permission";
import { PERMISSIONS } from "@sekiro/shared";
```

- [ ] **Step 2: Wrap the header "新增" button (lines 113-115)**

```tsx
      <HasPermission code={PERMISSIONS.POSITION_CREATE}>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="h-4 w-4" />{t("system.position.createPosition")}
        </Button>
      </HasPermission>
```

- [ ] **Step 3: Wrap the row action buttons (lines 97-104)**

```tsx
          <HasPermission code={PERMISSIONS.POSITION_UPDATE}>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-primary"
              onClick={() => { setEditing(r); setFormOpen(true); }}>
              <Edit2 className="h-3.5 w-3.5" />{t("common.edit")}
            </Button>
          </HasPermission>
          <HasPermission code={PERMISSIONS.POSITION_DELETE}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
              onClick={() => setDelId(r.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </HasPermission>
```

- [ ] **Step 4: Run typecheck + lint**

Run: `pnpm --filter @sekiro/web typecheck && pnpm --filter @sekiro/web lint`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add "apps/web/app/(dashboard)/system/position/page.tsx"
git commit -m "feat(web): permission-gate Position management page write buttons"
```

---

## Task 17: Gate Dict page buttons

**Files:**
- Modify: `apps/web/app/(dashboard)/system/dict/page.tsx`

- [ ] **Step 1: Add imports**

```typescript
import { HasPermission } from "@/components/shared/has-permission";
import { PERMISSIONS } from "@sekiro/shared";
```

- [ ] **Step 2: Wrap the type-list "新增" button (lines 187-190)**

```tsx
            <HasPermission code={PERMISSIONS.DICT_CREATE}>
              <Button size="sm" variant="ghost" className="h-7"
                onClick={() => { setEditingType(null); setTypeFormOpen(true); }}>
                <Plus className="h-3.5 w-3.5" />{t("common.create")}
              </Button>
            </HasPermission>
```

- [ ] **Step 3: Wrap the detail-header buttons (lines 253-265)**

```tsx
                <div className="flex gap-1">
                  <HasPermission code={PERMISSIONS.DICT_UPDATE}>
                    <Button size="sm" variant="ghost" className="h-7"
                      onClick={() => { setEditingType(active); setTypeFormOpen(true); }}>
                      <Edit2 className="h-3.5 w-3.5" />{t("system.dict.editType")}
                    </Button>
                  </HasPermission>
                  <HasPermission code={PERMISSIONS.DICT_DELETE}>
                    <Button size="sm" variant="ghost" className="h-7 text-destructive"
                      onClick={() => setDelType(active.id)}>
                      <Trash2 className="h-3.5 w-3.5" />{t("system.dict.deleteType")}
                    </Button>
                  </HasPermission>
                  <HasPermission code={PERMISSIONS.DICT_ITEM_CREATE}>
                    <Button size="sm"
                      onClick={() => { setEditingItem(null); setItemFormOpen(true); }}>
                      <Plus className="h-3.5 w-3.5" />{t("system.dict.createItem")}
                    </Button>
                  </HasPermission>
                </div>
```

- [ ] **Step 4: Wrap the item row action icons (lines 302-309)**

```tsx
                            <HasPermission code={PERMISSIONS.DICT_ITEM_UPDATE}>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary"
                                onClick={() => { setEditingItem(it); setItemFormOpen(true); }}>
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                            </HasPermission>
                            <HasPermission code={PERMISSIONS.DICT_ITEM_DELETE}>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                                onClick={() => setDelItemValue(it.value)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </HasPermission>
```

- [ ] **Step 5: Run typecheck + lint**

Run: `pnpm --filter @sekiro/web typecheck && pnpm --filter @sekiro/web lint`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add "apps/web/app/(dashboard)/system/dict/page.tsx"
git commit -m "feat(web): permission-gate Dict management page write buttons"
```

---

## Final Verification

- [ ] **Backend full suite + typecheck**

Run: `pnpm --filter @sekiro/api typecheck && pnpm --filter @sekiro/api test`
Expected: clean; all PASS.

- [ ] **Frontend typecheck + lint**

Run: `pnpm --filter @sekiro/web typecheck && pnpm --filter @sekiro/web lint`
Expected: clean.

- [ ] **Re-seed the database**

Run: `pnpm --filter @sekiro/api exec prisma db seed`
Expected: 41 menus seeded, role-menu grants include all 28 buttons for roles 1 & 2.

- [ ] **Manual end-to-end smoke**

1. Log in as `super_admin` → all write buttons visible on all 6 pages; writes succeed.
2. Log in as a low-privilege user (e.g. role 4 运营专员, no buttons) → all write buttons hidden; calling a write endpoint directly returns 403 with "无权限访问" toast.
3. As super_admin, change a user's role to grant `system:user:create` only → that user (after a page reload triggering `/auth/me`) sees only the User "新增" button; other User write buttons hidden.
