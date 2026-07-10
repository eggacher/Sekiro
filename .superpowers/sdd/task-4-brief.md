## Task 4: MfaProvider (TOTP Wrapper)

**Files:**
- Create: `apps/api/src/modules/auth/providers/mfa.provider.ts`
- Create: `apps/api/src/modules/auth/providers/__tests__/mfa.provider.spec.ts`

**Interfaces:**
- Produces: `MfaProvider.generateSecret(): string`
- Produces: `MfaProvider.getOtpauthUrl(secret, username, issuer?): string`
- Produces: `MfaProvider.verify(secret, code, window?): boolean`
- Consumes: `speakeasy`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { MfaProvider } from '../mfa.provider';

function generateToken(secret: string, step: number = 0): string {
  // Use speakeasy directly in test to generate a known-good token
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const speakeasy = require('speakeasy');
  return speakeasy.totp({
    secret,
    encoding: 'base32',
    step: 30,
    time: Math.floor(Date.now() / 30000) * 30 + step,
  });
}

describe('MfaProvider', () => {
  let provider: MfaProvider;

  beforeEach(() => {
    provider = new MfaProvider();
  });

  it('should generate a base32 secret', () => {
    const secret = provider.generateSecret();
    expect(secret).toMatch(/^[A-Z2-7]+$/);
    expect(secret.length).toBeGreaterThanOrEqual(32);
  });

  it('should return an otpauth URL', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const url = provider.getOtpauthUrl(secret, 'admin');
    expect(url).toContain('otpauth://totp/');
    expect(url).toContain('secret=JBSWY3DPEHPK3PXP');
    expect(url).toContain('issuer=Sekiro');
  });

  it('should verify a valid current TOTP code', () => {
    const secret = provider.generateSecret();
    const code = generateToken(secret);
    expect(provider.verify(secret, code)).toBe(true);
  });

  it('should reject an invalid code', () => {
    const secret = provider.generateSecret();
    expect(provider.verify(secret, '000000')).toBe(false);
  });

  it('should reject a code outside the allowed window', () => {
    const secret = provider.generateSecret();
    const oldCode = generateToken(secret, -120); // 2 minutes ago
    expect(provider.verify(secret, oldCode, 1)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd apps/api
pnpm test providers/__tests__/mfa.provider.spec.ts
```

Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

```typescript
import { Injectable } from '@nestjs/common';
import * as speakeasy from 'speakeasy';

@Injectable()
export class MfaProvider {
  generateSecret(): string {
    return speakeasy.generateSecret({ length: 32 }).base32;
  }

  getOtpauthUrl(
    secret: string,
    username: string,
    issuer: string = 'Sekiro',
  ): string {
    return speakeasy.otpauthURL({
      secret,
      label: `${issuer}:${username}`,
      issuer,
      encoding: 'base32',
    });
  }

  verify(secret: string, code: string, window: number = 1): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window,
    }) as boolean;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
cd apps/api
pnpm test providers/__tests__/mfa.provider.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/auth/providers/mfa.provider.ts \
        apps/api/src/modules/auth/providers/__tests__/mfa.provider.spec.ts
git commit -m "feat(mfa): add MfaProvider for TOTP generation and verification"
```

---

