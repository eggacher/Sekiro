## Task 3: MfaCryptoProvider

**Files:**
- Create: `apps/api/src/modules/auth/providers/mfa-crypto.provider.ts`
- Create: `apps/api/src/modules/auth/providers/__tests__/mfa-crypto.provider.spec.ts`

**Interfaces:**
- Produces: `MfaCryptoProvider.encrypt(secret: string): string`
- Produces: `MfaCryptoProvider.decrypt(encrypted: string): string`
- Consumes: `encryptConfig`/`decryptConfig` from `apps/api/src/modules/security/utils/crypto.util.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MfaCryptoProvider } from '../mfa-crypto.provider';

describe('MfaCryptoProvider', () => {
  let provider: MfaCryptoProvider;

  beforeEach(() => {
    process.env.MFA_SECRET_KEY = 'test-mfa-key-32-bytes-long!!';
    provider = new MfaCryptoProvider();
  });

  it('should encrypt and decrypt a secret', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const encrypted = provider.encrypt(secret);
    expect(encrypted).toMatch(/^ENC\(/);
    expect(provider.decrypt(encrypted)).toBe(secret);
  });

  it('should produce different ciphertexts for the same secret', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const encrypted1 = provider.encrypt(secret);
    const encrypted2 = provider.encrypt(secret);
    expect(encrypted1).not.toBe(encrypted2);
    expect(provider.decrypt(encrypted1)).toBe(secret);
    expect(provider.decrypt(encrypted2)).toBe(secret);
  });

  it('should throw on invalid encrypted format', () => {
    expect(() => provider.decrypt('not-encrypted')).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd apps/api
pnpm test providers/__tests__/mfa-crypto.provider.spec.ts
```

Expected: FAIL with "MfaCryptoProvider is not defined" or similar.

- [ ] **Step 3: Write minimal implementation**

```typescript
import { Injectable } from '@nestjs/common';
import {
  encryptConfig,
  decryptConfig,
} from '../../security/utils/crypto.util';

@Injectable()
export class MfaCryptoProvider {
  private readonly key: string;

  constructor() {
    const envKey = process.env.MFA_SECRET_KEY;
    if (!envKey) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('MFA_SECRET_KEY environment variable is required in production');
      }
      console.warn('[MfaCryptoProvider] MFA_SECRET_KEY not set, falling back to JWT_SECRET');
      this.key = process.env.JWT_SECRET || 'your-secret-key';
    } else {
      this.key = envKey;
    }
  }

  encrypt(secret: string): string {
    return encryptConfig(secret, this.key);
  }

  decrypt(encrypted: string): string {
    return decryptConfig(encrypted, this.key);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
cd apps/api
pnpm test providers/__tests__/mfa-crypto.provider.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/auth/providers/mfa-crypto.provider.ts \
        apps/api/src/modules/auth/providers/__tests__/mfa-crypto.provider.spec.ts
git commit -m "feat(mfa): add MfaCryptoProvider for TOTP secret encryption"
```

---

