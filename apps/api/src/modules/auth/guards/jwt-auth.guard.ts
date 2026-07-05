import { Injectable, UnauthorizedException, CanActivate, ExecutionContext, Inject } from '@nestjs/common';
import { JwtProvider } from '../providers/jwt.provider';

/**
 * JWT 认证守卫
 * 用于保护需要认证的路由
 * 从 Authorization: Bearer <token> 头提取并验证 JWT Token
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(JwtProvider) private jwtProvider: JwtProvider) {}

  canActivate(context: ExecutionContext): boolean {
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

    request.user = payload;
    return true;
  }
}
