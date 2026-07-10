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

  async verifyLogin(mfaToken: string, code: string): Promise<{ user: any; payload: any }> {
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

    return { user, payload };
  }
}
