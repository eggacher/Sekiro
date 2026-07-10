# Task 4 Report: MfaProvider (TOTP Wrapper)

## Status
DONE

## Files Created
- `apps/api/src/modules/auth/providers/mfa.provider.ts`
- `apps/api/src/modules/auth/providers/__tests__/mfa.provider.spec.ts`

## Commit
- `f2c086d` feat(mfa): add MfaProvider for TOTP generation and verification

## Implementation Summary
Created a NestJS-injectable `MfaProvider` wrapping `speakeasy` to:
- Generate base32 TOTP secrets (`generateSecret`)
- Build `otpauth://` URLs for QR code generation (`getOtpauthUrl`)
- Verify 6-digit TOTP codes with a configurable window (`verify`, default window 1)

## Test Summary
All 5 tests pass:
- generates a base32 secret
- returns an otpauth URL containing the expected scheme, secret, and issuer
- verifies a valid current TOTP code
- rejects an invalid code
- rejects a code outside the allowed window

## Verification Commands
```bash
cd apps/api
pnpm test providers/__tests__/mfa.provider.spec.ts
pnpm typecheck
```

## Concerns
- `pnpm typecheck` passes.
- Running the repository's ESLint configuration directly against the new test file produces an error: `Definition for rule '@typescript-eslint/no-var-requires' was not found`. This is caused by the `// eslint-disable-next-line @typescript-eslint/no-var-requires` comment prescribed by the task brief. The root ESLint config only extends `next/core-web-vitals` and does not load `@typescript-eslint`, so the disable comment references an undefined rule. Since `apps/api` has no `lint` script and the project's automated checks (`test`, `typecheck`) pass, this does not block the task, but a future cleanup could either remove the unused disable comment or add `@typescript-eslint` to the ESLint config.
