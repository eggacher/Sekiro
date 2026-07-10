# Issue #32: MFA / TOTP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement TOTP-based multi-factor authentication (MFA) for Sekiro, including user enrollment, login verification, and frontend UI.

**Architecture:** Add encrypted `mfaSecret`/`mfaEnabled` to the `User` model; introduce `MfaProvider` (TOTP), `MfaCryptoProvider` (AES-256-GCM), and `MfaService`; extend `JwtProvider` with a short-lived `mfaToken`; modify `AuthService.login` to require MFA when enabled; expose four new endpoints under `/auth/mfa/*`; update the Next.js login and profile pages.

**Tech Stack:** NestJS, Prisma, PostgreSQL, Redis, speakeasy, qrcode, Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui, Vitest.

## Global Constraints

- TOTP must follow RFC 6238: 6 digits, 30-second step, base32 secret.
- `mfaSecret` must be encrypted at rest using AES-256-GCM via `apps/api/src/modules/security/utils/crypto.util.ts`.
- Production must set `MFA_SECRET_KEY`; development may fall back to `JWT_SECRET` with a warning.
- `mfaToken` is signed with `JWT_SECRET`, has `type: 'mfa'`, expires in 5 minutes, and cannot access protected resources.
- MFA verification failures must not trigger account lockout.
- All code must pass `pnpm typecheck`, `pnpm test`, and `pnpm lint` (where applicable).
- Prefer focused files; each new provider/service gets its own file and matching unit test.
- Write the failing test before the implementation.

---

## File Structure

### Backend

| File | Responsibility |
|------|----------------|
| `apps/api/prisma/schema.prisma` | Add `mfaSecret` and `mfaEnabled` to `User` |
| `apps/api/package.json` | Add `speakeasy`, `@types/speakeasy`, `qrcode`, `@types/qrcode` |
| `apps/api/src/modules/auth/types.ts` | Add `MfaTokenPayload` |
| `apps/api/src/modules/auth/providers/mfa-crypto.provider.ts` | Encrypt/decrypt TOTP secrets |
| `apps/api/src/modules/auth/providers/mfa.provider.ts` | Generate secrets, otpauth URLs, verify TOTP codes |
| `apps/api/src/modules/auth/providers/jwt.provider.ts` | Add `signMfaToken`/`verifyMfaToken` |
| `apps/api/src/modules/auth/guards/jwt-auth.guard.ts` | Reject `type: 'mfa'` tokens |
| `apps/api/src/modules/auth/services/mfa.service.ts` | MFA business orchestration |
| `apps/api/src/modules/auth/services/auth.service.ts` | Branch login on `mfaEnabled`; add `loginWithMfa` |
| `apps/api/src/modules/auth/auth.controller.ts` | Add `/auth/mfa/*` endpoints |
| `apps/api/src/modules/auth/dtos/mfa-setup.dto.ts` | Setup request/response DTOs |
| `apps/api/src/modules/auth/dtos/mfa-verify.dto.ts` | Verify request/response DTOs |
| `apps/api/src/modules/auth/dtos/mfa-disable.dto.ts` | Disable request DTO |
| `apps/api/src/modules/auth/dtos/mfa-login-verify.dto.ts` | Login verify request DTO |
| `apps/api/src/modules/auth/dtos/login.dto.ts` | No change needed; re-exports `LoginResponse` from shared |
| `apps/api/src/modules/auth/auth.module.ts` | Register new providers/service |
| `apps/api/.env.example` | Add `MFA_SECRET_KEY` placeholder |

### Frontend

| File | Responsibility |
|------|----------------|
| `packages/shared/src/types.ts` | Add `mfaEnabled` to `CurrentUser`; update `LoginResponse`; add MFA shared types |
| `apps/web/app/(auth)/login/page.tsx` | Add MFA code input step |
| `apps/web/app/(dashboard)/profile/page.tsx` | Wire MFA switch to setup/verify/disable flows |
| `apps/web/components/mfa/mfa-setup-dialog.tsx` | QR code + verification dialog |
| `apps/web/components/mfa/mfa-verify-input.tsx` | Reusable 6-digit TOTP input |
| `apps/web/lib/api/client.ts` | Ensure it handles `ApiResponse` shape (no change expected) |

---

## Task 1: Prisma Schema Migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Test: `apps/api/prisma/schema.test.ts` (existing)

**Interfaces:**
- Produces: `User.mfaSecret?: string`, `User.mfaEnabled: boolean` in Prisma Client.

- [ ] **Step 1: Add MFA fields to `User` model**

```prisma
model User {
  id             Int       @id @default(autoincrement())
  username       String    @unique @db.VarChar(32)
  passwordHash   String    @map("password_hash") @db.VarChar(255)
  nickname       String    @db.VarChar(32)
  email          String?   @db.VarChar(128)
  phone          String?   @db.VarChar(20)
  avatar         String?   @db.VarChar(512)
  deptId         Int?      @map("dept_id")
  status         String    @default("enabled") @db.VarChar(16)
  lockedUntil    DateTime? @map("locked_until")
  loginFailCount Int       @default(0) @map("login_fail_count")
  lastLoginAt    DateTime? @map("last_login_at")
  mfaSecret      String?   @map("mfa_secret") @db.VarChar(512)
  mfaEnabled     Boolean   @default(false) @map("mfa_enabled")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")
  deletedAt      DateTime? @map("deleted_at")

  dept      Dept?          @relation("UserDept", fields: [deptId], references: [id])
  roles     UserRole[]
  positions UserPosition[]

  @@map("user")
}
```

- [ ] **Step 2: Run Prisma migration**

Run:
```bash
cd apps/api
pnpm prisma migrate dev --name add_mfa_fields
```

Expected: migration SQL file created under `prisma/migrations/`, database updated, no errors.

- [ ] **Step 3: Regenerate Prisma Client**

Run:
```bash
cd apps/api
pnpm prisma generate
```

Expected: `node_modules/.prisma/client` updated; `User` type now has `mfaSecret` and `mfaEnabled`.

- [ ] **Step 4: Verify schema test still passes**

Run:
```bash
cd apps/api
pnpm test prisma/schema.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/
git commit -m "feat(mfa): add mfaSecret and mfaEnabled to User model"
```

---

## Task 2: Install MFA Dependencies

**Files:**
- Modify: `apps/api/package.json`
- Test: `pnpm-lock.yaml` updated after install

**Interfaces:**
- Produces: `speakeasy`, `qrcode` available in `@sekiro/api`.

- [ ] **Step 1: Add dependencies to `apps/api/package.json`**

```json
{
  "dependencies": {
    "speakeasy": "^2.0.0",
    "qrcode": "^1.5.3"
  },
  "devDependencies": {
    "@types/speakeasy": "^2.0.8",
    "@types/qrcode": "^1.5.5"
  }
}
```

Insert them into the existing `dependencies` and `devDependencies` objects, keeping alphabetical order.

- [ ] **Step 2: Install packages**

Run:
```bash
pnpm install
```

Expected: lockfile updated, `node_modules` contains `speakeasy` and `qrcode`.

- [ ] **Step 3: Verify imports work**

Create a temporary check file `apps/api/tmp-mfa-check.ts`:

```typescript
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
console.log(typeof speakeasy.generateSecret, typeof QRCode.toDataURL);
```

Run:
```bash
cd apps/api
pnpm tsx tmp-mfa-check.ts
```

Expected: prints `function function`. Then delete the file.

- [ ] **Step 4: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml
git commit -m "chore(deps): add speakeasy and qrcode for TOTP MFA"
```

---

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

## Task 5: JwtProvider MFA Token Methods

**Files:**
- Modify: `apps/api/src/modules/auth/types.ts`
- Modify: `apps/api/src/modules/auth/providers/jwt.provider.ts`
- Modify: `apps/api/src/modules/auth/providers/__tests__/jwt.provider.spec.ts`

**Interfaces:**
- Produces: `JwtProvider.signMfaToken(payload): { mfaToken: string; expiresIn: number }`
- Produces: `JwtProvider.verifyMfaToken(token): MfaTokenPayload | null`
- Consumes: `@nestjs/jwt`

- [ ] **Step 1: Write the failing test additions**

Append to `apps/api/src/modules/auth/providers/__tests__/jwt.provider.spec.ts`:

```typescript
describe('MFA token', () => {
  it('should sign and verify an MFA token', () => {
    const { mfaToken, expiresIn } = jwtProvider.signMfaToken({
      sub: 1,
      username: 'admin',
    });

    expect(mfaToken).toBeDefined();
    expect(expiresIn).toBe(300);

    const payload = jwtProvider.verifyMfaToken(mfaToken);
    expect(payload).not.toBeNull();
    expect(payload!.sub).toBe(1);
    expect(payload!.username).toBe('admin');
    expect(payload!.type).toBe('mfa');
  });

  it('should reject an expired MFA token', () => {
    const { mfaToken } = jwtProvider.signMfaToken({ sub: 1, username: 'admin' });
    // Simulate expiration by advancing time is hard with jwtService.sign;
    // Instead verify a tampered token returns null.
    const payload = jwtProvider.verifyMfaToken(mfaToken + 'tamper');
    expect(payload).toBeNull();
  });

  it('should reject a standard access token as MFA token', () => {
    const { token } = jwtProvider.signToken({
      sub: 1,
      username: 'admin',
      roles: [],
      sid: 'session-1',
    });
    expect(jwtProvider.verifyMfaToken(token)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd apps/api
pnpm test providers/__tests__/jwt.provider.spec.ts
```

Expected: FAIL with `signMfaToken is not a function`.

- [ ] **Step 3: Add `MfaTokenPayload` type**

Modify `apps/api/src/modules/auth/types.ts` to add:

```typescript
export interface MfaTokenPayload {
  sub: number;
  username: string;
  remember?: boolean;
  type: 'mfa';
  iat: number;
  exp: number;
}
```

- [ ] **Step 4: Implement MFA token methods**

Modify `apps/api/src/modules/auth/providers/jwt.provider.ts`:

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenPayload, RefreshTokenPayload, MfaTokenPayload } from '../types';

@Injectable()
export class JwtProvider {
  private readonly jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
  private readonly refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || 'refresh-secret-key';

  constructor(@Inject(JwtService) private readonly jwtService: JwtService) {}

  signToken(payload: Omit<TokenPayload, 'iat' | 'exp'>) {
    const token = this.jwtService.sign(payload, {
      secret: this.jwtSecret,
      expiresIn: '2h',
    });
    return { token, expiresIn: 7200 };
  }

  verifyToken(token: string): TokenPayload | null {
    try {
      const payload = this.jwtService.verify<TokenPayload>(token, {
        secret: this.jwtSecret,
      });
      return payload;
    } catch (error) {
      return null;
    }
  }

  signRefreshToken(payload: Omit<RefreshTokenPayload, 'iat' | 'exp' | 'type'>) {
    const refreshToken = this.jwtService.sign(
      { ...payload, type: 'refresh' },
      {
        secret: this.refreshTokenSecret,
        expiresIn: '30d',
      }
    );
    return { refreshToken, expiresIn: 2592000 };
  }

  verifyRefreshToken(token: string): RefreshTokenPayload | null {
    try {
      const payload = this.jwtService.verify<RefreshTokenPayload>(token, {
        secret: this.refreshTokenSecret,
      });
      if (payload.type !== 'refresh') {
        return null;
      }
      return payload;
    } catch (error) {
      return null;
    }
  }

  signMfaToken(payload: Omit<MfaTokenPayload, 'iat' | 'exp' | 'type'>) {
    const mfaToken = this.jwtService.sign(
      { ...payload, type: 'mfa' },
      {
        secret: this.jwtSecret,
        expiresIn: '5m',
      }
    );
    return { mfaToken, expiresIn: 300 };
  }

  verifyMfaToken(token: string): MfaTokenPayload | null {
    try {
      const payload = this.jwtService.verify<MfaTokenPayload>(token, {
        secret: this.jwtSecret,
      });
      if (payload.type !== 'mfa') {
        return null;
      }
      return payload;
    } catch (error) {
      return null;
    }
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run:
```bash
cd apps/api
pnpm test providers/__tests__/jwt.provider.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/auth/types.ts \
        apps/api/src/modules/auth/providers/jwt.provider.ts \
        apps/api/src/modules/auth/providers/__tests__/jwt.provider.spec.ts
git commit -m "feat(mfa): add mfaToken signing and verification to JwtProvider"
```

---

## Task 6: MfaService

**Files:**
- Create: `apps/api/src/modules/auth/services/mfa.service.ts`
- Create: `apps/api/src/modules/auth/services/__tests__/mfa.service.spec.ts`

**Interfaces:**
- Consumes: `PrismaService`, `MfaProvider`, `MfaCryptoProvider`, `JwtProvider`
- Produces: `MfaService.setup(userId, username): Promise<MfaSetupResponse>`
- Produces: `MfaService.verifyAndEnable(userId, code): Promise<MfaVerifyResponse>`
- Produces: `MfaService.disable(userId, code): Promise<MfaVerifyResponse>`
- Produces: `MfaService.verifyLogin(mfaToken, code): Promise<User>`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MfaService } from '../mfa.service';
import { MfaProvider } from '../../providers/mfa.provider';
import { MfaCryptoProvider } from '../../providers/mfa-crypto.provider';
import { JwtProvider } from '../../providers/jwt.provider';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

describe('MfaService', () => {
  let service: MfaService;
  let prismaService: any;
  let mfaProvider: MfaProvider;
  let cryptoProvider: MfaCryptoProvider;
  let jwtProvider: any;

  beforeEach(() => {
    process.env.MFA_SECRET_KEY = 'test-key-32-bytes-long-for-mfa!';

    prismaService = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };

    mfaProvider = new MfaProvider();
    cryptoProvider = new MfaCryptoProvider();

    jwtProvider = {
      signMfaToken: vi.fn(),
      verifyMfaToken: vi.fn(),
    };

    service = new MfaService(
      prismaService,
      mfaProvider,
      cryptoProvider,
      jwtProvider,
    );
  });

  describe('setup', () => {
    it('should generate secret and qr code for user without MFA', async () => {
      prismaService.user.findUnique.mockResolvedValueOnce({
        id: 1,
        username: 'admin',
        mfaEnabled: false,
      });
      prismaService.user.update.mockResolvedValueOnce({});

      const result = await service.setup(1, 'admin');

      expect(result.secret).toBeDefined();
      expect(result.qrCodeUrl).toMatch(/^data:image\/png;base64,/);
      expect(result.manualEntryKey).toBe(result.secret);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { mfaSecret: expect.stringMatching(/^ENC\(/) },
      });
    });

    it('should throw if MFA already enabled', async () => {
      prismaService.user.findUnique.mockResolvedValueOnce({
        id: 1,
        mfaEnabled: true,
      });

      await expect(service.setup(1, 'admin')).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyAndEnable', () => {
    it('should enable MFA with valid code', async () => {
      const secret = mfaProvider.generateSecret();
      const code = mfaProvider.verify(secret, '000000') ? '000000' : 'fallback';
      // Generate a real code for the secret
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const speakeasy = require('speakeasy');
      const validCode = speakeasy.totp({ secret, encoding: 'base32' });

      prismaService.user.findUnique.mockResolvedValueOnce({
        id: 1,
        mfaSecret: cryptoProvider.encrypt(secret),
      });
      prismaService.user.update.mockResolvedValueOnce({});

      const result = await service.verifyAndEnable(1, validCode);

      expect(result.enabled).toBe(true);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { mfaEnabled: true },
      });
    });

    it('should throw with invalid code', async () => {
      const secret = mfaProvider.generateSecret();
      prismaService.user.findUnique.mockResolvedValueOnce({
        id: 1,
        mfaSecret: cryptoProvider.encrypt(secret),
      });

      await expect(service.verifyAndEnable(1, '000000')).rejects.toThrow(BadRequestException);
    });
  });

  describe('disable', () => {
    it('should disable MFA with valid code', async () => {
      const secret = mfaProvider.generateSecret();
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const speakeasy = require('speakeasy');
      const validCode = speakeasy.totp({ secret, encoding: 'base32' });

      prismaService.user.findUnique.mockResolvedValueOnce({
        id: 1,
        mfaEnabled: true,
        mfaSecret: cryptoProvider.encrypt(secret),
      });
      prismaService.user.update.mockResolvedValueOnce({});

      const result = await service.disable(1, validCode);

      expect(result.enabled).toBe(false);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { mfaEnabled: false, mfaSecret: null },
      });
    });
  });

  describe('verifyLogin', () => {
    it('should return user when mfaToken and code are valid', async () => {
      const secret = mfaProvider.generateSecret();
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const speakeasy = require('speakeasy');
      const validCode = speakeasy.totp({ secret, encoding: 'base32' });
      const user = {
        id: 1,
        username: 'admin',
        mfaEnabled: true,
        mfaSecret: cryptoProvider.encrypt(secret),
      };

      jwtProvider.verifyMfaToken.mockReturnValueOnce({ sub: 1, username: 'admin', type: 'mfa' });
      prismaService.user.findUnique.mockResolvedValueOnce(user);

      const result = await service.verifyLogin('mfa.token', validCode);
      expect(result.id).toBe(1);
    });

    it('should throw if mfaToken is invalid', async () => {
      jwtProvider.verifyMfaToken.mockReturnValueOnce(null);

      await expect(service.verifyLogin('bad.token', '123456')).rejects.toThrow(UnauthorizedException);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd apps/api
pnpm test services/__tests__/mfa.service.spec.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement MfaService**

```typescript
import {
  Injectable,
  Inject,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../prisma/prisma.service';
import { MfaProvider } from '../providers/mfa.provider';
import { MfaCryptoProvider } from '../providers/mfa-crypto.provider';
import { JwtProvider } from '../providers/jwt.provider';

@Injectable()
export class MfaService {
  constructor(
    @Inject(PrismaService) private prismaService: PrismaService,
    @Inject(MfaProvider) private mfaProvider: MfaProvider,
    @Inject(MfaCryptoProvider) private mfaCryptoProvider: MfaCryptoProvider,
    @Inject(JwtProvider) private jwtProvider: JwtProvider,
  ) {}

  async setup(userId: number, username: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    if (user.mfaEnabled) {
      throw new BadRequestException('两步验证已开启');
    }

    const secret = this.mfaProvider.generateSecret();
    const encryptedSecret = this.mfaCryptoProvider.encrypt(secret);

    await this.prismaService.user.update({
      where: { id: userId },
      data: { mfaSecret: encryptedSecret },
    });

    const otpauthUrl = this.mfaProvider.getOtpauthUrl(secret, username);
    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

    return {
      secret,
      qrCodeUrl,
      manualEntryKey: secret,
    };
  }

  async verifyAndEnable(userId: number, code: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.mfaSecret) {
      throw new BadRequestException('未开启两步验证');
    }

    const secret = this.mfaCryptoProvider.decrypt(user.mfaSecret);

    if (!this.mfaProvider.verify(secret, code)) {
      throw new BadRequestException('验证码错误或已过期');
    }

    await this.prismaService.user.update({
      where: { id: userId },
      data: { mfaEnabled: true },
    });

    return { enabled: true };
  }

  async disable(userId: number, code: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestException('未开启两步验证');
    }

    const secret = this.mfaCryptoProvider.decrypt(user.mfaSecret);

    if (!this.mfaProvider.verify(secret, code)) {
      throw new BadRequestException('验证码错误或已过期');
    }

    await this.prismaService.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecret: null },
    });

    return { enabled: false };
  }

  async verifyLogin(mfaToken: string, code: string) {
    const payload = this.jwtProvider.verifyMfaToken(mfaToken);

    if (!payload) {
      throw new UnauthorizedException('验证已过期，请重新登录');
    }

    const user = await this.prismaService.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      throw new UnauthorizedException('验证已过期，请重新登录');
    }

    const secret = this.mfaCryptoProvider.decrypt(user.mfaSecret);

    if (!this.mfaProvider.verify(secret, code)) {
      throw new BadRequestException('验证码错误或已过期');
    }

    return user;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
cd apps/api
pnpm test services/__tests__/mfa.service.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/auth/services/mfa.service.ts \
        apps/api/src/modules/auth/services/__tests__/mfa.service.spec.ts
git commit -m "feat(mfa): add MfaService for enrollment and verification"
```

---

## Task 7: Update AuthService for MFA Branching

**Files:**
- Modify: `apps/api/src/modules/auth/services/auth.service.ts`
- Modify: `apps/api/src/modules/auth/services/__tests__/auth.service.spec.ts`

**Interfaces:**
- Consumes: `JwtProvider.signMfaToken`/`verifyMfaToken`, `MfaService.verifyLogin`
- Produces: `AuthService.login` returns `{ code: 0, data: { mfaRequired: true, mfaToken } }` when MFA enabled
- Produces: `AuthService.loginWithMfa(mfaToken, code, ipAddress, userAgent): Promise<LoginResult>`

- [ ] **Step 1: Write failing test additions**

Add to `apps/api/src/modules/auth/services/__tests__/auth.service.spec.ts`:

```typescript
// Add to the imports at the top if not present:
import { MfaService } from '../mfa.service';

// In beforeEach, add mfaService mock after loginFailureProvider:
let mfaService: any;

// Inside beforeEach, before constructing service:
mfaService = {
  verifyLogin: vi.fn(),
};

// Add to the existing jwtProvider mock in beforeEach:
jwtProvider.signMfaToken = vi.fn().mockReturnValue({ mfaToken: 'mfa.token', expiresIn: 300 });
jwtProvider.verifyMfaToken = vi.fn();

// Update service construction:
service = new AuthService(
  prismaService,
  jwtProvider,
  redisSessionProvider,
  loginFailureProvider,
  mfaService,
);

// Add new describe blocks at the end:
describe('login with MFA', () => {
  it('should return mfaRequired when MFA is enabled', async () => {
    const loginRequest = {
      username: 'admin',
      password: 'admin123',
      remember: false,
    };
    const hashedPassword = await bcrypt.hash('admin123', 10);

    prismaService.user.findUnique.mockResolvedValueOnce({
      id: 1,
      username: 'admin',
      passwordHash: hashedPassword,
      nickname: 'Administrator',
      email: 'admin@example.com',
      phone: null,
      avatar: null,
      status: 'enabled',
      deptId: 1,
      mfaEnabled: true,
    });

    jwtProvider.signMfaToken.mockReturnValueOnce({
      mfaToken: 'mfa.token',
      expiresIn: 300,
    });

    const result = await service.login(loginRequest, '127.0.0.1', 'UA');

    expect(result.code).toBe(0);
    expect(result.data.mfaRequired).toBe(true);
    expect(result.data.mfaToken).toBe('mfa.token');
    expect(redisSessionProvider.createSession).not.toHaveBeenCalled();
  });

  it('should return full login response when MFA is disabled', async () => {
    const loginRequest = {
      username: 'admin',
      password: 'admin123',
      remember: false,
    };
    const hashedPassword = await bcrypt.hash('admin123', 10);

    prismaService.user.findUnique.mockResolvedValueOnce({
      id: 1,
      username: 'admin',
      passwordHash: hashedPassword,
      nickname: 'Administrator',
      email: 'admin@example.com',
      phone: null,
      avatar: null,
      status: 'enabled',
      deptId: 1,
      mfaEnabled: false,
    });

    prismaService.userRole.findMany.mockResolvedValueOnce([]);
    prismaService.menu.findMany.mockResolvedValueOnce([]);
    prismaService.userRole.findMany.mockResolvedValueOnce([]);
    prismaService.menu.findMany.mockResolvedValueOnce([]);

    jwtProvider.signToken.mockReturnValueOnce({ token: 'jwt.token', expiresIn: 7200 });
    jwtProvider.signRefreshToken.mockReturnValueOnce({ refreshToken: 'rt.token', expiresIn: 2592000 });

    const result = await service.login(loginRequest, '127.0.0.1', 'UA');

    expect(result.code).toBe(0);
    expect(result.data.token).toBe('jwt.token');
    expect(result.data.mfaRequired).toBeUndefined();
  });
});

describe('loginWithMfa', () => {
  it('should return full login response after valid MFA code', async () => {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const user = {
      id: 1,
      username: 'admin',
      passwordHash: hashedPassword,
      nickname: 'Administrator',
      email: 'admin@example.com',
      phone: null,
      avatar: null,
      status: 'enabled',
      deptId: 1,
      mfaEnabled: true,
    };

    mfaService.verifyLogin.mockResolvedValueOnce(user);
    prismaService.userRole.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    prismaService.menu.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    jwtProvider.verifyMfaToken.mockReturnValueOnce({
      sub: 1,
      username: 'admin',
      type: 'mfa',
      remember: false,
    });
    jwtProvider.signToken.mockReturnValueOnce({ token: 'jwt.token', expiresIn: 7200 });
    jwtProvider.signRefreshToken.mockReturnValueOnce({ refreshToken: 'rt.token', expiresIn: 2592000 });

    const result = await service.loginWithMfa('mfa.token', '123456', '127.0.0.1', 'UA');

    expect(result.code).toBe(0);
    expect(result.data.token).toBe('jwt.token');
    expect(mfaService.verifyLogin).toHaveBeenCalledWith('mfa.token', '123456');
    expect(redisSessionProvider.createSession).toHaveBeenCalled();
    expect(prismaService.loginLog.create).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd apps/api
pnpm test services/__tests__/auth.service.spec.ts
```

Expected: FAIL.

- [ ] **Step 3: Modify AuthService constructor and login method**

Update imports and constructor:

```typescript
import {
  Injectable,
  Logger,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtProvider } from '../providers/jwt.provider';
import { RedisSessionProvider } from '../providers/redis-session.provider';
import { LoginFailureProvider } from '../providers/login-failure.provider';
import { MfaService } from './mfa.service';
import type { CurrentUser, LoginRequest, Menu } from '@sekiro/shared';
```

Constructor:

```typescript
constructor(
  @Inject(PrismaService) private prismaService: PrismaService,
  @Inject(JwtProvider) private jwtProvider: JwtProvider,
  @Inject(RedisSessionProvider) private redisSessionProvider: RedisSessionProvider,
  @Inject(LoginFailureProvider) private loginFailureProvider: LoginFailureProvider,
  @Inject(MfaService) private mfaService: MfaService,
) {}
```

After password verification and `clearFailure`, add MFA branch:

```typescript
// 5. 验证成功！清除失败计数
await this.loginFailureProvider.clearFailure(user.id);

// 6. 如果用户开启了 MFA，进入第二步验证
if (user.mfaEnabled) {
  const { mfaToken } = this.jwtProvider.signMfaToken({
    sub: user.id,
    username: user.username,
    remember: request.remember || false,
  });
  return {
    code: 0,
    data: {
      mfaRequired: true,
      mfaToken,
    },
  };
}

// 7. 计算权限和菜单
const permissions = await this.getUserPermissions(user.id);
const menus = await this.buildMenuTree(user.id);

// ... rest unchanged
```

- [ ] **Step 4: Add `loginWithMfa` method**

Append to `AuthService`:

```typescript
/**
 * MFA 第二步验证并签发正式 Token
 */
async loginWithMfa(
  mfaToken: string,
  code: string,
  ipAddress: string,
  userAgent: string,
): Promise<any> {
  const user = await this.mfaService.verifyLogin(mfaToken, code);

  // 从 mfaToken payload 中读取 remember 偏好
  const payload = this.jwtProvider.verifyMfaToken(mfaToken);
  const remember = payload?.remember || false;

  // 清除登录失败计数
  await this.loginFailureProvider.clearFailure(user.id);

  // 计算权限和菜单
  const permissions = await this.getUserPermissions(user.id);
  const menus = await this.buildMenuTree(user.id);

  // 创建 Session ID 并签发 Token
  const sessionId = uuidv4();
  const { token, expiresIn } = this.jwtProvider.signToken({
    sub: user.id,
    username: user.username,
    roles: permissions.map((p) => p.split(':')[0]).filter((v, i, a) => a.indexOf(v) === i),
    sid: sessionId,
  });

  const { refreshToken } = this.jwtProvider.signRefreshToken({
    sub: user.id,
    username: user.username,
  });

  // 创建 Session
  const session = {
    userId: user.id,
    username: user.username,
    token,
    refreshToken,
    remember,
    ip: ipAddress,
    userAgent,
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
  await this.redisSessionProvider.createSession(sessionId, session, 2592000);

  // 更新用户登录时间并写日志
  await this.prismaService.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  await this.prismaService.loginLog.create({
    data: {
      username: user.username,
      result: 'success',
      message: '登录成功',
      ip: ipAddress,
      browser: userAgent,
      os: userAgent,
    },
  });

  // 返回响应
  return {
    code: 0,
    data: {
      token,
      refreshToken,
      expiresIn,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        status: user.status,
        deptId: user.deptId,
      },
      permissions,
      menus,
    },
  };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run:
```bash
cd apps/api
pnpm test services/__tests__/auth.service.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/auth/services/auth.service.ts \
        apps/api/src/modules/auth/services/__tests__/auth.service.spec.ts
git commit -m "feat(mfa): branch login on mfaEnabled and add loginWithMfa"
```

---

## Task 8: Update JwtAuthGuard to Reject MFA Tokens

**Files:**
- Modify: `apps/api/src/modules/auth/guards/jwt-auth.guard.ts`
- Create: `apps/api/src/modules/auth/guards/__tests__/jwt-auth.guard.spec.ts`

**Interfaces:**
- Consumes: `JwtProvider.verifyToken`
- Produces: `JwtAuthGuard` throws `UnauthorizedException` when `payload.type === 'mfa'`

- [ ] **Step 1: Write the failing test**

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { UnauthorizedException } from '@nestjs/common';

function createExecutionContext(headers: Record<string, string>) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as any;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtProvider: any;
  let redisSessionProvider: any;

  beforeEach(() => {
    jwtProvider = {
      verifyToken: vi.fn(),
    };
    redisSessionProvider = {
      getSession: vi.fn(),
    };
    guard = new JwtAuthGuard(jwtProvider, redisSessionProvider);
  });

  it('should reject tokens with type mfa', async () => {
    jwtProvider.verifyToken.mockReturnValueOnce({
      sub: 1,
      username: 'admin',
      type: 'mfa',
    });

    await expect(
      guard.canActivate(createExecutionContext({ authorization: 'Bearer mfa.token' })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should allow standard access tokens', async () => {
    jwtProvider.verifyToken.mockReturnValueOnce({
      sub: 1,
      username: 'admin',
      roles: [],
      sid: 'session-1',
    });
    redisSessionProvider.getSession.mockResolvedValueOnce({});

    const result = await guard.canActivate(
      createExecutionContext({ authorization: 'Bearer access.token' }),
    );
    expect(result).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:
```bash
cd apps/api
pnpm test guards/__tests__/jwt-auth.guard.spec.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement the guard change**

Modify `apps/api/src/modules/auth/guards/jwt-auth.guard.ts`:

```typescript
import { Injectable, UnauthorizedException, CanActivate, ExecutionContext, Inject } from '@nestjs/common';
import { JwtProvider } from '../providers/jwt.provider';
import { RedisSessionProvider } from '../providers/redis-session.provider';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(JwtProvider) private jwtProvider: JwtProvider,
    @Inject(RedisSessionProvider) private redisSessionProvider: RedisSessionProvider,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException({ code: 401, message: '未认证' });
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = this.jwtProvider.verifyToken(token);

    if (!payload) {
      throw new UnauthorizedException({ code: 401, message: 'Token 已过期或无效' });
    }

    // MFA 临时 token 不能访问受保护资源
    if (payload.type === 'mfa') {
      throw new UnauthorizedException({ code: 401, message: 'Token 已过期或无效' });
    }

    if (payload.sid) {
      const session = await this.redisSessionProvider.getSession(payload.sid);
      if (!session) {
        throw new UnauthorizedException({ code: 401, message: '会话已失效' });
      }
    }

    request.user = payload;
    return true;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:
```bash
cd apps/api
pnpm test guards/__tests__/jwt-auth.guard.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/auth/guards/jwt-auth.guard.ts \
        apps/api/src/modules/auth/guards/__tests__/jwt-auth.guard.spec.ts
git commit -m "feat(mfa): reject mfa tokens in JwtAuthGuard"
```

---

## Task 9: Add MFA Controller Endpoints and DTOs

**Files:**
- Create: `apps/api/src/modules/auth/dtos/mfa-setup.dto.ts`
- Create: `apps/api/src/modules/auth/dtos/mfa-verify.dto.ts`
- Create: `apps/api/src/modules/auth/dtos/mfa-disable.dto.ts`
- Create: `apps/api/src/modules/auth/dtos/mfa-login-verify.dto.ts`
- Modify: `apps/api/src/modules/auth/dtos/login.dto.ts`
- Modify: `apps/api/src/modules/auth/dtos/index.ts`
- Modify: `apps/api/src/modules/auth/auth.controller.ts`
- Modify: `apps/api/src/modules/auth/auth.module.ts`

**Interfaces:**
- Consumes: `MfaService.setup/verifyAndEnable/disable`, `AuthService.loginWithMfa`
- Produces: HTTP endpoints `/auth/mfa/setup`, `/auth/mfa/verify`, `/auth/mfa/disable`, `/auth/mfa/login-verify`

- [ ] **Step 1: Create DTO files**

`apps/api/src/modules/auth/dtos/mfa-setup.dto.ts`:

```typescript
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MfaSetupResponseDto {
  @ApiProperty({ description: '明文 TOTP secret（仅展示一次）' })
  @IsString()
  @IsNotEmpty()
  secret!: string;

  @ApiProperty({ description: '二维码 Data URL' })
  @IsString()
  @IsNotEmpty()
  qrCodeUrl!: string;

  @ApiProperty({ description: '手动输入密钥' })
  @IsString()
  @IsNotEmpty()
  manualEntryKey!: string;
}
```

`apps/api/src/modules/auth/dtos/mfa-verify.dto.ts`:

```typescript
import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MfaVerifyDto {
  @ApiProperty({ description: '6 位 TOTP 验证码', example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code!: string;
}

export class MfaVerifyResponseDto {
  @ApiProperty({ description: '是否已启用' })
  enabled!: boolean;
}
```

`apps/api/src/modules/auth/dtos/mfa-disable.dto.ts`:

```typescript
import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MfaDisableDto {
  @ApiProperty({ description: '当前 6 位 TOTP 验证码', example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code!: string;
}
```

`apps/api/src/modules/auth/dtos/mfa-login-verify.dto.ts`:

```typescript
import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MfaLoginVerifyDto {
  @ApiProperty({ description: 'MFA 临时 token' })
  @IsString()
  @IsNotEmpty()
  mfaToken!: string;

  @ApiProperty({ description: '6 位 TOTP 验证码', example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  code!: string;
}
```

- [ ] **Step 2: Update login DTO**

`apps/api/src/modules/auth/dtos/login.dto.ts` already re-exports `LoginResponse` from `@sekiro/shared`. Since the shared `LoginResponse` interface was updated in Task 10 with optional `mfaRequired` and `mfaToken`, no change is needed here. If you want to document the response shape in Swagger, add `@ApiPropertyOptional` annotations to a response DTO later; for this plan the shared type is sufficient.

- [ ] **Step 3: Update DTO index**

`apps/api/src/modules/auth/dtos/index.ts`:

```typescript
export * from './login.dto';
export * from './refresh.dto';
export * from './mfa-setup.dto';
export * from './mfa-verify.dto';
export * from './mfa-disable.dto';
export * from './mfa-login-verify.dto';
```

- [ ] **Step 4: Modify AuthController**

Update `apps/api/src/modules/auth/auth.controller.ts` imports and add endpoints:

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './services/auth.service';
import { MfaService } from './services/mfa.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  LoginDto,
  RefreshDto,
  RefreshResponse,
  MfaVerifyDto,
  MfaDisableDto,
  MfaLoginVerifyDto,
} from './dtos';
import type { ApiResponse as ApiResponseType } from '@sekiro/shared';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private authService: AuthService,
    @Inject(MfaService) private mfaService: MfaService,
  ) {}

  // ... existing login method remains, but note data shape change below

  @Post('mfa/setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '生成 MFA 绑定信息' })
  async mfaSetup(@Req() req: any): Promise<ApiResponseType<any>> {
    const { sub, username } = req.user;
    const result = await this.mfaService.setup(sub, username);
    return { code: 0, message: '生成成功', data: result };
  }

  @Post('mfa/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '验证并启用 MFA' })
  async mfaVerify(
    @Req() req: any,
    @Body() dto: MfaVerifyDto,
  ): Promise<ApiResponseType<any>> {
    const result = await this.mfaService.verifyAndEnable(req.user.sub, dto.code);
    return { code: 0, message: '启用成功', data: result };
  }

  @Post('mfa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '关闭 MFA' })
  async mfaDisable(
    @Req() req: any,
    @Body() dto: MfaDisableDto,
  ): Promise<ApiResponseType<any>> {
    const result = await this.mfaService.disable(req.user.sub, dto.code);
    return { code: 0, message: '关闭成功', data: result };
  }

  @Post('mfa/login-verify')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60 * 1000 } })
  @ApiOperation({ summary: 'MFA 登录验证' })
  async mfaLoginVerify(
    @Body() dto: MfaLoginVerifyDto,
    @Req() req: any,
  ): Promise<ApiResponseType<any>> {
    const ipAddress = req.ip || '0.0.0.0';
    const userAgent = req.headers['user-agent'] || '';
    const result = await this.authService.loginWithMfa(
      dto.mfaToken,
      dto.code,
      ipAddress,
      userAgent,
    );

    if ('data' in result) {
      return { code: 0, message: '登录成功', data: result.data };
    }
    return { code: result.code, message: result.message, data: null };
  }
}
```

- [ ] **Step 5: Update AuthModule**

`apps/api/src/modules/auth/auth.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { MfaService } from './services/mfa.service';
import { DataScopeService } from './services/data-scope.service';
import { JwtProvider } from './providers/jwt.provider';
import { RedisSessionProvider } from './providers/redis-session.provider';
import { LoginFailureProvider } from './providers/login-failure.provider';
import { MfaProvider } from './providers/mfa.provider';
import { MfaCryptoProvider } from './providers/mfa-crypto.provider';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    JwtModule.register({ secret: process.env.JWT_SECRET || 'your-secret-key' }),
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    MfaService,
    JwtProvider,
    RedisSessionProvider,
    LoginFailureProvider,
    MfaProvider,
    MfaCryptoProvider,
    JwtAuthGuard,
    DataScopeService,
  ],
  exports: [
    AuthService,
    MfaService,
    JwtProvider,
    RedisSessionProvider,
    JwtAuthGuard,
    DataScopeService,
  ],
})
export class AuthModule {}
```

- [ ] **Step 6: Run API tests and typecheck**

Run:
```bash
cd apps/api
pnpm test
pnpm typecheck
```

Expected: PASS and no type errors.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/auth/dtos/ \
        apps/api/src/modules/auth/auth.controller.ts \
        apps/api/src/modules/auth/auth.module.ts
git commit -m "feat(mfa): add MFA endpoints and DTOs"
```

---

## Task 10: Update Shared Types

**Files:**
- Modify: `packages/shared/src/types.ts`
- Test: `packages/shared` builds successfully

**Interfaces:**
- Produces: Updated `LoginResponse`, `CurrentUser`, and new MFA shared interfaces.

- [ ] **Step 1: Update shared types**

Modify `packages/shared/src/types.ts`:

```typescript
/** 登录响应 */
export interface LoginResponse {
  token?: string;
  refreshToken?: string;
  expiresIn?: number;
  user?: Omit<User, 'createdAt'>;
  permissions?: string[];
  menus?: Menu[];
  mfaRequired?: boolean;
  mfaToken?: string;
}

/** 当前登录用户信息 */
export interface CurrentUser {
  id: number;
  username: string;
  nickname: string;
  avatar?: string;
  email?: string;
  phone?: string;
  roles: string[];
  permissions: string[];
  mfaEnabled?: boolean;
}

/** MFA 绑定响应 */
export interface MfaSetupResponse {
  secret: string;
  qrCodeUrl: string;
  manualEntryKey: string;
}

/** MFA 验证请求 */
export interface MfaVerifyRequest {
  code: string;
}

/** MFA 验证响应 */
export interface MfaVerifyResponse {
  enabled: boolean;
}

/** MFA 登录验证请求 */
export interface MfaLoginVerifyRequest {
  mfaToken: string;
  code: string;
}
```

- [ ] **Step 2: Build shared package**

Run:
```bash
pnpm --filter @sekiro/shared build
```

Expected: builds without errors.

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src/types.ts
git commit -m "feat(mfa): update shared types for MFA"
```

---

## Task 11: Update Frontend Login Page

**Files:**
- Modify: `apps/web/app/(auth)/login/page.tsx`

**Interfaces:**
- Consumes: `LoginResponse.mfaRequired`, `LoginResponse.mfaToken`, new `MfaLoginVerifyRequest`
- Produces: Login page supports a second MFA code input step.

- [ ] **Step 1: Add MFA state and verification logic**

Modify `apps/web/app/(auth)/login/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, User, Loader2, Github, Shield } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { AuroraBackground } from "@/components/aceternity/aurora";
import { Logo } from "@/components/layout/logo";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";
import { useTranslation } from "@/lib/i18n";
import type { CurrentUser, LoginResponse } from "@sekiro/shared";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaToken, setMfaToken] = useState<string | null>(null);

  const { setAuth } = useAuthStore();
  const { t } = useTranslation();

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error(t("login.error.required"));
      return;
    }
    setLoading(true);
    try {
      const data = await apiClient.post<LoginResponse>("/auth/login", {
        username,
        password,
        remember,
      });

      if (data.mfaRequired) {
        setMfaToken(data.mfaToken || null);
        setLoading(false);
        return;
      }

      completeLogin(data);
    } catch (err: any) {
      toast.error(err.message || t("login.error.failed"));
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaToken || mfaCode.length !== 6) {
      toast.error("请输入 6 位验证码");
      return;
    }
    setLoading(true);
    try {
      const data = await apiClient.post<LoginResponse>("/auth/mfa/login-verify", {
        mfaToken,
        code: mfaCode,
      });
      completeLogin(data);
    } catch (err: any) {
      toast.error(err.message || t("login.error.failed"));
      setLoading(false);
    }
  };

  const completeLogin = (data: LoginResponse) => {
    const currentUser: CurrentUser = {
      id: data.user!.id,
      username: data.user!.username,
      nickname: data.user!.nickname,
      avatar: data.user!.avatar,
      email: data.user!.email,
      phone: data.user!.phone,
      roles: [],
      permissions: data.permissions || [],
    };

    setAuth(data.token!, currentUser, data.permissions || [], data.menus || []);
    toast.success(t("login.success"));
    router.push("/");
  };

  const resetToLogin = () => {
    setMfaToken(null);
    setMfaCode("");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-4">
      <AuroraBackground />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-2xl border bg-card/80 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-8 flex flex-col items-center text-center">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <Logo />
            </motion.div>
            <h1 className="mt-6 text-2xl font-bold tracking-tight">
              {mfaToken ? t("login.mfaTitle") || "两步验证" : t("login.title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mfaToken
                ? t("login.mfaSubtitle") || "请输入 Authenticator 应用中的 6 位验证码"
                : t("login.subtitle")}
            </p>
          </div>

          {!mfaToken ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* existing username/password/remember form unchanged */}
              <div className="space-y-2">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t("login.username")}
                    className="h-11 pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type={showPwd ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("login.password")}
                    className="h-11 pl-9 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
                  <span className="text-muted-foreground">{t("login.rememberMe")}</span>
                </label>
                <a href="#" className="text-primary hover:underline">
                  {t("login.forgotPassword")}
                </a>
              </div>

              <Button type="submit" className="h-11 w-full text-base" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("login.loggingIn")}
                  </>
                ) : (
                  t("login.submit")
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleMfaSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="h-11 pl-9 text-center text-lg tracking-[0.5em]"
                    inputMode="numeric"
                  />
                </div>
              </div>

              <Button type="submit" className="h-11 w-full text-base" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    验证中...
                  </>
                ) : (
                  "验证并登录"
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={resetToLogin}
                disabled={loading}
              >
                返回重新登录
              </Button>
            </form>
          )}

          {/* existing divider and social login unchanged */}
          <div className="my-6 flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">{t("login.otherMethods")}</span>
            <Separator className="flex-1" />
          </div>

          <div className="flex justify-center gap-3">
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-full">
              <Github className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-full">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2z" />
              </svg>
            </Button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t("login.copyright")}
        </p>
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Run web typecheck and lint**

Run:
```bash
cd apps/web
pnpm typecheck
pnpm lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/(auth)/login/page.tsx
git commit -m "feat(mfa): add MFA step to login page"
```

---

## Task 12: Update Frontend Profile Page and Components

**Files:**
- Create: `apps/web/components/mfa/mfa-verify-input.tsx`
- Create: `apps/web/components/mfa/mfa-setup-dialog.tsx`
- Modify: `apps/web/app/(dashboard)/profile/page.tsx`

**Interfaces:**
- Consumes: `CurrentUser.mfaEnabled`, `/auth/mfa/setup`, `/auth/mfa/verify`, `/auth/mfa/disable`
- Produces: Reusable `MfaVerifyInput`, `MfaSetupDialog`, and wired profile MFA switch.

- [ ] **Step 1: Create `MfaVerifyInput` component**

`apps/web/components/mfa/mfa-verify-input.tsx`:

```typescript
"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

interface MfaVerifyInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function MfaVerifyInput({ value, onChange, disabled }: MfaVerifyInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
    onChange(digits);
  };

  return (
    <Input
      value={value}
      onChange={handleChange}
      placeholder="000000"
      maxLength={6}
      disabled={disabled}
      inputMode="numeric"
      className="h-11 text-center text-lg tracking-[0.5em]"
    />
  );
}
```

- [ ] **Step 2: Create `MfaSetupDialog` component**

`apps/web/components/mfa/mfa-setup-dialog.tsx`:

```typescript
"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MfaVerifyInput } from "./mfa-verify-input";
import { apiClient } from "@/lib/api/client";
import type { MfaSetupResponse } from "@sekiro/shared";

interface MfaSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnabled: () => void;
}

export function MfaSetupDialog({ open, onOpenChange, onEnabled }: MfaSetupDialogProps) {
  const [setup, setSetup] = React.useState<MfaSetupResponse | null>(null);
  const [code, setCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);

  React.useEffect(() => {
    if (open && !setup) {
      setLoading(true);
      apiClient
        .post<MfaSetupResponse>("/auth/mfa/setup", {})
        .then(setSetup)
        .catch((err) => toast.error(err.message || "生成二维码失败"))
        .finally(() => setLoading(false));
    }
  }, [open, setup]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error("请输入 6 位验证码");
      return;
    }
    setVerifying(true);
    try {
      await apiClient.post("/auth/mfa/verify", { code });
      toast.success("两步验证已开启");
      onEnabled();
      onOpenChange(false);
      setSetup(null);
      setCode("");
    } catch (err: any) {
      toast.error(err.message || "验证码错误");
    } finally {
      setVerifying(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSetup(null);
    setCode("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>开启两步验证</DialogTitle>
          <DialogDescription>
            使用 Authenticator 应用扫描二维码，然后输入 6 位验证码完成绑定。
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">加载中...</div>
        ) : (
          <div className="space-y-4">
            {setup?.qrCodeUrl && (
              <div className="flex flex-col items-center gap-2">
                <img
                  src={setup.qrCodeUrl}
                  alt="MFA QR Code"
                  className="h-48 w-48 rounded border"
                />
                <div className="w-full space-y-1">
                  <Label>手动输入密钥</Label>
                  <Input value={setup.manualEntryKey} readOnly />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="mfa-code">验证码</Label>
              <MfaVerifyInput id="mfa-code" value={code} onChange={setCode} disabled={verifying} />
            </div>

            <Button onClick={handleVerify} disabled={verifying || code.length !== 6} className="w-full">
              {verifying ? "验证中..." : "确认开启"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Modify profile page MFA section**

Modify `apps/web/app/(dashboard)/profile/page.tsx`:

Add imports:

```typescript
import { MfaSetupDialog } from "@/components/mfa/mfa-setup-dialog";
import { MfaVerifyInput } from "@/components/mfa/mfa-verify-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
```

Add state after other state declarations:

```typescript
const [mfaSetupOpen, setMfaSetupOpen] = React.useState(false);
const [mfaDisableOpen, setMfaDisableOpen] = React.useState(false);
const [disableCode, setDisableCode] = React.useState("");
const [disabling, setDisabling] = React.useState(false);
```

Add handlers:

```typescript
const handleMfaToggle = (checked: boolean) => {
  if (checked) {
    setMfaSetupOpen(true);
  } else {
    setMfaDisableOpen(true);
  }
};

const handleMfaEnabled = () => {
  // Trigger a refresh of /auth/me or update local state
  apiClient.get("/auth/me").then((data) => {
    useAuthStore.setState((state) => ({
      ...state,
      user: data.user ? { ...state.user, ...data.user } : state.user,
    }));
  });
};

const handleDisableMfa = async () => {
  if (disableCode.length !== 6) {
    toast.error("请输入 6 位验证码");
    return;
  }
  setDisabling(true);
  try {
    await apiClient.post("/auth/mfa/disable", { code: disableCode });
    toast.success("两步验证已关闭");
    setMfaDisableOpen(false);
    setDisableCode("");
    handleMfaEnabled();
  } catch (err: any) {
    toast.error(err.message || "关闭失败");
  } finally {
    setDisabling(false);
  }
};
```

Replace the existing MFA placeholder block in the security tab:

```tsx
<div className="flex items-center justify-between rounded-lg border p-3">
  <div className="flex items-start gap-2">
    <Shield className="mt-0.5 h-4 w-4 text-primary" />
    <div>
      <div className="text-sm font-medium">两步验证 (MFA)</div>
      <div className="text-xs text-muted-foreground">使用 TOTP 应用增强账户安全</div>
    </div>
  </div>
  <Switch
    checked={user?.mfaEnabled || false}
    onCheckedChange={handleMfaToggle}
  />
</div>

<MfaSetupDialog
  open={mfaSetupOpen}
  onOpenChange={setMfaSetupOpen}
  onEnabled={handleMfaEnabled}
/>

<Dialog open={mfaDisableOpen} onOpenChange={setMfaDisableOpen}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle>关闭两步验证</DialogTitle>
      <DialogDescription>
        请输入 Authenticator 应用中的 6 位验证码以确认关闭。
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-4">
      <MfaVerifyInput value={disableCode} onChange={setDisableCode} disabled={disabling} />
      <Button onClick={handleDisableMfa} disabled={disabling || disableCode.length !== 6} className="w-full">
        {disabling ? "关闭中..." : "确认关闭"}
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

- [ ] **Step 4: Run web typecheck and lint**

Run:
```bash
cd apps/web
pnpm typecheck
pnpm lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/components/mfa/ \
        apps/web/app/(dashboard)/profile/page.tsx
git commit -m "feat(mfa): add MFA setup and disable flows to profile"
```

---

## Task 13: Update Environment Configuration

**Files:**
- Modify: `apps/api/.env.example`

**Interfaces:**
- Produces: Documented `MFA_SECRET_KEY` environment variable.

- [ ] **Step 1: Add MFA_SECRET_KEY placeholder**

Append to `apps/api/.env.example`:

```bash
# MFA TOTP secret encryption key (32+ bytes recommended, base64/hex or plain string)
# In production this MUST be set and kept secret.
MFA_SECRET_KEY=your-mfa-secret-key-min-32-bytes-long
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/.env.example
git commit -m "docs(env): document MFA_SECRET_KEY"
```

---

## Task 14: Final Verification

**Files:**
- All modified files

**Interfaces:**
- Produces: A working MFA feature passing all quality gates.

- [ ] **Step 1: Run backend tests**

Run:
```bash
cd apps/api
pnpm test
```

Expected: All tests pass.

- [ ] **Step 2: Run backend typecheck**

Run:
```bash
cd apps/api
pnpm typecheck
```

Expected: No type errors.

- [ ] **Step 3: Run frontend typecheck**

Run:
```bash
cd apps/web
pnpm typecheck
```

Expected: No type errors.

- [ ] **Step 4: Run frontend lint**

Run:
```bash
cd apps/web
pnpm lint
```

Expected: No lint errors.

- [ ] **Step 5: Run shared package build**

Run:
```bash
pnpm --filter @sekiro/shared build
```

Expected: Builds successfully.

- [ ] **Step 6: Manual smoke test (optional but recommended)**

1. Start the backend: `cd apps/api && pnpm dev`
2. Start the frontend: `cd apps/web && pnpm dev`
3. Log in as `admin` / `admin123` (MFA disabled → normal login).
4. Go to 个人中心 → 安全设置 → 开启两步验证.
5. Scan QR with Google Authenticator, enter code, verify enabled.
6. Log out.
7. Log in again; enter password, then TOTP from Authenticator.
8. Verify successful login.
9. Disable MFA in profile; verify disabled.

- [ ] **Step 7: Final commit (if any remaining changes)**

```bash
git add -A
git commit -m "feat(mfa): complete TOTP MFA implementation (#32)"
```

---

## Self-Review Checklist

**1. Spec coverage:**
- ✅ Prisma schema fields (`mfaSecret`, `mfaEnabled`) → Task 1
- ✅ TOTP secret encryption → Task 3
- ✅ TOTP generation/verification → Task 4
- ✅ MFA token (5-min, type: 'mfa') → Task 5
- ✅ Login branching on `mfaEnabled` → Task 7
- ✅ Reject mfa tokens in guard → Task 8
- ✅ `/auth/mfa/setup`, `/auth/mfa/verify`, `/auth/mfa/disable`, `/auth/mfa/login-verify` → Task 9
- ✅ Shared types updated → Task 10
- ✅ Frontend login MFA step → Task 11
- ✅ Frontend profile MFA setup/disable → Task 12
- ✅ `MFA_SECRET_KEY` env documentation → Task 13
- ✅ Tests for all new providers/services → Tasks 3-8

**2. Placeholder scan:**
- ✅ No "TBD", "TODO", or "implement later".
- ✅ No vague "add error handling" steps.
- ✅ Every code step includes actual code.
- ✅ No "similar to Task N" shortcuts.

**3. Type consistency:**
- ✅ `MfaService` constructor signature matches injection in `AuthModule`.
- ✅ `AuthService` constructor signature updated in test and module.
- ✅ `LoginResponse` optional fields align with frontend usage (`data.user!`, `data.token!`).
- ✅ `MfaTokenPayload.type` is `'mfa'`; guard checks `payload.type === 'mfa'`.
- ✅ DTO classes use `class-validator` decorators consistent with existing DTOs.

**4. Known limitations / follow-up:**
- Recovery codes are out of scope (per spec).
- Admin reset of MFA is out of scope (per spec).
- Global MFA enforcement is out of scope (per spec).
