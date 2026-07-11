import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SUPER_ADMIN_ROLE } from '@sekiro/shared';
import { PERMISSIONS_KEY } from '../decorators/requires-permissions.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.get<string>(PERMISSIONS_KEY, context.getHandler());
    if (!required) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException({ code: 401, message: '未认证' });
    }

    const roles: string[] = user.roles ?? [];
    if (roles.includes(SUPER_ADMIN_ROLE)) {
      return true;
    }

    const permissions: string[] = user.permissions ?? [];
    if (!permissions.includes(required)) {
      throw new ForbiddenException({ code: 403, message: '无权限访问' });
    }
    return true;
  }
}
