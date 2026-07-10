import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MfaService, isMfaSuccess } from '../mfa.service';
import { MfaProvider } from '../../providers/mfa.provider';
import { MfaCryptoProvider } from '../../providers/mfa-crypto.provider';
import { JwtProvider } from '../../providers/jwt.provider';

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

      expect(isMfaSuccess(result)).toBe(true);
      if (!isMfaSuccess(result)) {
        throw new Error('Expected success result');
      }
      expect(result.data.secret).toBeDefined();
      expect(result.data.qrCodeUrl).toMatch(/^data:image\/png;base64,/);
      expect(result.data.manualEntryKey).toBe(result.data.secret);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { mfaSecret: expect.stringMatching(/^ENC\(/) },
      });
    });

    it('should return business error if MFA already enabled', async () => {
      prismaService.user.findUnique.mockResolvedValueOnce({
        id: 1,
        mfaEnabled: true,
      });

      const result = await service.setup(1, 'admin');

      expect(isMfaSuccess(result)).toBe(false);
      if (isMfaSuccess(result)) {
        throw new Error('Expected failure result');
      }
      expect(result.code).toBe(1);
      expect(result.message).toBe('两步验证已开启');
    });
  });

  describe('verifyAndEnable', () => {
    it('should enable MFA with valid code', async () => {
      const secret = mfaProvider.generateSecret();
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const speakeasy = require('speakeasy');
      const validCode = speakeasy.totp({ secret, encoding: 'base32' });

      prismaService.user.findUnique.mockResolvedValueOnce({
        id: 1,
        mfaSecret: cryptoProvider.encrypt(secret),
      });
      prismaService.user.update.mockResolvedValueOnce({});

      const result = await service.verifyAndEnable(1, validCode);

      expect(isMfaSuccess(result)).toBe(true);
      if (!isMfaSuccess(result)) {
        throw new Error('Expected success result');
      }
      expect(result.data.enabled).toBe(true);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { mfaEnabled: true },
      });
    });

    it('should return business error with invalid code', async () => {
      const secret = mfaProvider.generateSecret();
      prismaService.user.findUnique.mockResolvedValueOnce({
        id: 1,
        mfaSecret: cryptoProvider.encrypt(secret),
      });

      const result = await service.verifyAndEnable(1, '000000');

      expect(isMfaSuccess(result)).toBe(false);
      if (isMfaSuccess(result)) {
        throw new Error('Expected failure result');
      }
      expect(result.code).toBe(1);
      expect(result.message).toBe('验证码错误或已过期');
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

      expect(isMfaSuccess(result)).toBe(true);
      if (!isMfaSuccess(result)) {
        throw new Error('Expected success result');
      }
      expect(result.data.enabled).toBe(false);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { mfaEnabled: false, mfaSecret: null },
      });
    });
  });

  describe('verifyLogin', () => {
    it('should return user and payload when mfaToken and code are valid', async () => {
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
      const tokenPayload = { sub: 1, username: 'admin', type: 'mfa' };

      jwtProvider.verifyMfaToken.mockReturnValueOnce(tokenPayload);
      prismaService.user.findUnique.mockResolvedValueOnce(user);

      const result = await service.verifyLogin('mfa.token', validCode);
      expect(isMfaSuccess(result)).toBe(true);
      if (!isMfaSuccess(result)) {
        throw new Error('Expected success result');
      }
      expect(result.data.user.id).toBe(1);
      expect(result.data.payload).toEqual(tokenPayload);
    });

    it('should return business error if mfaToken is invalid', async () => {
      jwtProvider.verifyMfaToken.mockReturnValueOnce(null);

      const result = await service.verifyLogin('bad.token', '123456');

      expect(isMfaSuccess(result)).toBe(false);
      if (isMfaSuccess(result)) {
        throw new Error('Expected failure result');
      }
      expect(result.code).toBe(401);
      expect(result.message).toBe('验证已过期，请重新登录');
    });
  });
});
