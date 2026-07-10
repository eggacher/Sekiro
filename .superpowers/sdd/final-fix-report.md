# Issue #31 Final Fix Report

## Summary

Addressed all Important and Minor findings from the whole-branch review for Issue #31.

## What Was Fixed

### Important

1. **Missing `positionNames` in backend response**
   - `apps/api/src/modules/user/repositories/user.repository.ts` now maps both `positionIds` and `positionNames` in `findById` and `findPage`.
   - Added explicit return types using an internal `UserWithPositions` type derived from Prisma's `UserGetPayload`.
   - `packages/shared/src/types.ts`: added `positionNames?: string[]` to the `User` interface.
   - `apps/api/src/modules/user/__tests__/user.repository.positions.spec.ts`: assertions now cover both arrays and verify the Prisma `include` clause.

2. **`std-env` ESM test execution issue**
   - Root `package.json` engine requirement bumped from `>=18.17.0` to `>=22.0.0`.
   - Added `.nvmrc` with `22` so `nvm use` selects a Node version that supports `require(ESM)`.
   - Verified that `pnpm --filter @sekiro/api test` passes on Node v22.23.1.

3. **Mock-only repository tests**
   - Added `positionsInclude` constant and `toHaveBeenCalledWith` assertions for `findFirst` / `findMany` to ensure the correct Prisma include is used.

4. **Inaccurate documentation**
   - `.superpowers/sdd/GITHUB_ISSUES_STATUS.md`: changed "Select 多选模式" to "Checkbox 组" and updated the verification note.
   - `.superpowers/sdd/progress.md`: updated Task 1 description and noted that `pnpm lint` currently covers only `apps/web`.

### Minor

5. **Missing explicit return types on repository methods**
   - `findById` now returns `Promise<UserWithPositions | null>`.
   - `findPage` now returns `Promise<PageResult<UserWithPositions>>`.

6. **`UserFormDialog` effect dependency array**
   - Added `positions` to the dependency array at `apps/web/app/(dashboard)/system/user/page.tsx:411`.

7. **Lint coverage note**
   - Added an explicit note in `.superpowers/sdd/progress.md` that `pnpm lint` currently only runs `apps/web` because `apps/api` and `packages/shared` have no ESLint configuration. Adding ESLint configs to those packages was deemed out of scope for this fix pass.

8. **Dead controls in user form**
   - Added a code comment above `handleSave` explaining that `roleIds` and `status` are intentionally excluded from the save payload due to DTO `whitelist`/`forbidNonWhitelisted` constraints, matching existing behavior.

## Verification Results

Run with Node v22.23.1 (selected via `nvm use`):

| Command | Result |
| --- | --- |
| `pnpm typecheck` | PASS |
| `pnpm --filter @sekiro/api test` | PASS (122/122) |
| `pnpm lint` | PASS (covers `apps/web` only) |

## Files Changed

- `.nvmrc`
- `package.json`
- `packages/shared/src/types.ts`
- `apps/api/src/modules/user/repositories/user.repository.ts`
- `apps/api/src/modules/user/__tests__/user.repository.positions.spec.ts`
- `apps/web/app/(dashboard)/system/user/page.tsx`
- `.superpowers/sdd/GITHUB_ISSUES_STATUS.md`
- `.superpowers/sdd/progress.md`
- `pnpm-lock.yaml` (updated by `pnpm install`)

## Issues or Concerns

- The working tree also contained uncommitted modifications to `.superpowers/sdd/task-3-brief.md`, `task-3-report.md`, `task-4-brief.md`, and `task-4-report.md` that pre-dated this fix pass. These were included in the fix commit to preserve the branch state; they contain Story #31 task content written by the previous implementer.
- `pnpm lint` still only covers `apps/web`. Adding lint configs/scripts to `apps/api` and `packages/shared` is a worthwhile follow-up but outside the scope of Issue #31.
