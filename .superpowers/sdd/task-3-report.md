# Task 3 Report: MfaCryptoProvider

## Status
DONE

## Summary
Implemented `MfaCryptoProvider` to encrypt/decrypt TOTP secrets using the existing `encryptConfig`/`decryptConfig` crypto utility.

## Files Created
- `apps/api/src/modules/auth/providers/mfa-crypto.provider.ts`
- `apps/api/src/modules/auth/providers/__tests__/mfa-crypto.provider.spec.ts`

## Files Changed
- `apps/api/vitest.config.ts` → `apps/api/vitest.config.mts` (renamed to fix ESM config loading)

## Implementation Notes
- `MfaCryptoProvider` is `@Injectable()`.
- Reads `MFA_SECRET_KEY` from environment.
- Throws in production if `MFA_SECRET_KEY` is missing.
- Falls back to `JWT_SECRET` (or a placeholder) in development with a console warning.
- `encrypt()` delegates to `encryptConfig(secret, this.key)`.
- `decrypt()` validates the `ENC(...)` wrapper before delegating to `decryptConfig(encrypted, this.key)` and throws on invalid format.

## Deviation from Brief
The brief's implementation delegated decryption directly to `decryptConfig`, but the current `decryptConfig` returns non-`ENC(...)` input unchanged rather than throwing. To satisfy the test expectation `provider.decrypt("not-encrypted")` throws, I added a minimal format guard in `MfaCryptoProvider.decrypt()` before delegating.

## Test Results
```
✓ src/modules/auth/providers/__tests__/mfa-crypto.provider.spec.ts (3 tests)
Test Files  1 passed (1)
Tests  3 passed (3)
```

Typecheck also passes:
```
> pnpm typecheck
(tsc --noEmit succeeds)
```

## Commits
- `4d43259` feat(mfa): add MfaCryptoProvider for TOTP secret encryption
- `8dac25d` fix(test): rename vitest config to .mts for ESM compatibility

## Concerns
- The `vitest.config.ts` → `.mts` rename was required because `vitest@4.1.9` fails to load its config in CommonJS mode due to `std-env@4.1.0` being pure ESM. This is a pre-existing workspace issue, not caused by this task, but the rename is necessary for tests to run.
- `MfaCryptoProvider.decrypt()` duplicates the `ENC(...)` format check that already exists inside `decryptConfig`; ideally `decryptConfig` itself would throw on non-encrypted input, but the provider wrapper is the minimal change to satisfy the current contract.
