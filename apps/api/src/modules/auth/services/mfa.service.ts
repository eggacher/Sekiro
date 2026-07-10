import {
  Injectable,
  Inject,
} from '@nestjs/common';
import * as QRCode from 'qrcode';
import { PrismaService } from '../../prisma/prisma.service';
import { MfaProvider } from '../providers/mfa.provider';
import { MfaCryptoProvider } from '../providers/mfa-crypto.provider';
import { JwtProvider } from '../providers/jwt.provider';

export type MfaServiceResult<T = unknown> =
  | { code: 0; data: T }
  | { code: number; message: string };

export function isMfaSuccess<T>(
  result: MfaServiceResult<T>,
): result is { code: 0; data: T } {
  return result.code === 0;
}

@Injectable()
export class MfaService {
  constructor(
    @Inject(PrismaService) private prismaService: PrismaService,
    @Inject(MfaProvider) private mfaProvider: MfaProvider,
    @Inject(MfaCryptoProvider) private mfaCryptoProvider: MfaCryptoProvider,
    @Inject(JwtProvider) private jwtProvider: JwtProvider,
  ) {}

  async setup(userId: number, username: string): Promise<MfaServiceResult<{ secret: string; qrCodeUrl: string; manualEntryKey: string }>> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { code: 1, message: '用户不存在' };
    }

    if (user.mfaEnabled) {
      return { code: 1, message: '两步验证已开启' };
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
      code: 0,
      data: {
        secret,
        qrCodeUrl,
        manualEntryKey: secret,
      },
    };
  }

  async verifyAndEnable(userId: number, code: string): Promise<MfaServiceResult<{ enabled: boolean }>> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.mfaSecret) {
      return { code: 1, message: '未开启两步验证' };
    }

    const secret = this.mfaCryptoProvider.decrypt(user.mfaSecret);

    if (!this.mfaProvider.verify(secret, code)) {
      return { code: 1, message: '验证码错误或已过期' };
    }

    await this.prismaService.user.update({
      where: { id: userId },
      data: { mfaEnabled: true },
    });

    return { code: 0, data: { enabled: true } };
  }

  async disable(userId: number, code: string): Promise<MfaServiceResult<{ enabled: boolean }>> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      return { code: 1, message: '未开启两步验证' };
    }

    const secret = this.mfaCryptoProvider.decrypt(user.mfaSecret);

    if (!this.mfaProvider.verify(secret, code)) {
      return { code: 1, message: '验证码错误或已过期' };
    }

    await this.prismaService.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecret: null },
    });

    return { code: 0, data: { enabled: false } };
  }

  async verifyLogin(
    mfaToken: string,
    code: string,
  ): Promise<MfaServiceResult<{ user: any; payload: any }>> {
    const payload = this.jwtProvider.verifyMfaToken(mfaToken);

    if (!payload) {
      return { code: 401, message: '验证已过期，请重新登录' };
    }

    const user = await this.prismaService.user.findUnique({
      where: { id: payload.sub },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      return { code: 401, message: '验证已过期，请重新登录' };
    }

    const secret = this.mfaCryptoProvider.decrypt(user.mfaSecret);

    if (!this.mfaProvider.verify(secret, code)) {
      return { code: 1, message: '验证码错误或已过期' };
    }

    return { code: 0, data: { user, payload } };
  }
}
