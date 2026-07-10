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
      expect(result.user.id).toBe(1);
      expect(result.payload).toEqual(tokenPayload);
    });

    it('should throw if mfaToken is invalid', async () => {
      jwtProvider.verifyMfaToken.mockReturnValueOnce(null);

      await expect(service.verifyLogin('bad.token', '123456')).rejects.toThrow(UnauthorizedException);
    });
  });
});
