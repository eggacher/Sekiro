import { Injectable, UnauthorizedException, CanActivate, ExecutionContext, Inject } from '@nestjs/common';
import { JwtProvider } from '../providers/jwt.provider';
import { RedisSessionProvider } from '../providers/redis-session.provider';

/**
 * JWT 认证守卫
 * 用于保护需要认证的路由
 * 从 Authorization: Bearer <token> 头提取并验证 JWT Token
 */
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

    let permissions: string[] = [];
    let roles: string[] = [];
    if (payload.sid) {
      const session = await this.redisSessionProvider.getSession(payload.sid);
      if (!session) {
        throw new UnauthorizedException({ code: 401, message: '会话已失效' });
      }
      permissions = session.permissions ?? [];
      roles = session.roles ?? [];
    }

    request.user = { ...payload, permissions, roles };
    return true;
  }
}
