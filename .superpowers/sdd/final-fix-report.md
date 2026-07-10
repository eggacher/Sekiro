# Issue #32 MFA — Final Review Fixes

**Date:** 2026-07-10
**Fixes based on:** `.superpowers/sdd/final-review.md`

---

## Issues Fixed

### Important 1: `AuthService.getMe` now returns `mfaEnabled`

- **File:** `apps/api/src/modules/auth/services/auth.service.ts`
- Added `mfaEnabled: user.mfaEnabled` to the `CurrentUser` object returned by `getMe`.
- Added unit test in `apps/api/src/modules/auth/services/__tests__/auth.service.spec.ts` asserting the field is present.

### Important 2: `AuthService.loginWithMfa` no longer verifies `mfaToken` twice

- **Files:**
  - `apps/api/src/modules/auth/services/mfa.service.ts`
  - `apps/api/src/modules/auth/services/auth.service.ts`
- Changed `MfaService.verifyLogin` to return `{ user, payload }`.
- Updated `AuthService.loginWithMfa` to read `payload.remember` from the returned payload instead of calling `jwtProvider.verifyMfaToken` again.
- Updated unit tests in `mfa.service.spec.ts` and `auth.service.spec.ts` to match the new return shape and removed the now-unused `verifyMfaToken` mock in `auth.service.spec.ts`.

### Important 4: Hardened token typing

- **Files:**
  - `apps/api/src/modules/auth/types.ts`
  - `apps/api/src/modules/auth/providers/jwt.provider.ts`
  - `apps/api/src/modules/auth/guards/jwt-auth.guard.ts`
  - `apps/api/src/modules/auth/providers/__tests__/jwt.provider.spec.ts`
- Added `type?: 'access' | 'mfa'` to `TokenPayload`.
- Updated `JwtProvider.verifyToken` to reject tokens with `type === 'mfa'` (defense in depth).
- Updated `JwtAuthGuard` to use `payload.type === 'mfa'` directly instead of casting.
- Added unit test asserting `verifyToken` rejects MFA tokens.

### Minor: Cleaned up `MfaProvider.verify` cast

- **File:** `apps/api/src/modules/auth/providers/mfa.provider.ts`
- Replaced `as boolean` with `!!` to handle the `boolean | null` return from `speakeasy.totp.verify`.

### Minor: Kept `MfaCryptoProvider.decrypt` `ENC(...)` format check

- **File:** `apps/api/src/modules/auth/providers/mfa-crypto.provider.ts`
- The existing unit test expects `decrypt('not-encrypted')` to throw, while `decryptConfig` returns non-encrypted input unchanged. Therefore the explicit format check is retained.

---

## Verification Results

| Check | Command | Result |
|-------|---------|--------|
| API tests | `cd apps/api && pnpm test` | 145/145 passed |
| API typecheck | `cd apps/api && pnpm typecheck` | clean |
| Web typecheck | `cd apps/web && pnpm typecheck` | clean |
| Web lint | `cd apps/web && pnpm lint` | no warnings or errors |
| Shared build | `pnpm --filter @sekiro/shared build` | success |

---

## Files Changed

- `apps/api/src/modules/auth/types.ts`
- `apps/api/src/modules/auth/providers/jwt.provider.ts`
- `apps/api/src/modules/auth/providers/mfa.provider.ts`
- `apps/api/src/modules/auth/guards/jwt-auth.guard.ts`
- `apps/api/src/modules/auth/services/auth.service.ts`
- `apps/api/src/modules/auth/services/mfa.service.ts`
- `apps/api/src/modules/auth/services/__tests__/auth.service.spec.ts`
- `apps/api/src/modules/auth/services/__tests__/mfa.service.spec.ts`
- `apps/api/src/modules/auth/providers/__tests__/jwt.provider.spec.ts`

---

## Notes / Follow-up

- The baseline migration documentation issue (Important 3 in the review) was **not** addressed in this fix pass because it was not included in the requested fix list.
- The pre-existing modification to `.superpowers/sdd/progress.md` was left unstaged.
