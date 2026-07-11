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
    return {
      token,
      expiresIn: 7200, // 2 hours in seconds
    };
  }

  verifyToken(token: string): TokenPayload | null {
    try {
      const payload = this.jwtService.verify<TokenPayload>(token, {
        secret: this.jwtSecret,
      });
      if (payload.type === 'mfa') {
        return null;
      }
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
    return {
      refreshToken,
      expiresIn: 2592000, // 30 days in seconds
    };
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
    return {
      mfaToken,
      expiresIn: 300, // 5 minutes in seconds
    };
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
