import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PermissionGuard } from '../permission.guard';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PERMISSIONS, SUPER_ADMIN_ROLE } from '@sekiro/shared';

function createExecutionContext(user: any, handler: any) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => handler,
  } as any;
}

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let reflector: any;

  beforeEach(() => {
    reflector = { get: vi.fn() };
    guard = new PermissionGuard(reflector);
  });

  it('should allow when no @RequiresPermissions metadata', async () => {
    reflector.get.mockReturnValue(undefined);
    const result = await guard.canActivate(createExecutionContext({ sub: 1 }, () => {}));
    expect(result).toBe(true);
  });

  it('should allow super_admin bypass', async () => {
    reflector.get.mockReturnValue(PERMISSIONS.USER_CREATE);
    const result = await guard.canActivate(
      createExecutionContext({ sub: 1, roles: [SUPER_ADMIN_ROLE], permissions: [] }, () => {}),
    );
    expect(result).toBe(true);
  });

  it('should allow when user has the required permission', async () => {
    reflector.get.mockReturnValue(PERMISSIONS.USER_CREATE);
    const result = await guard.canActivate(
      createExecutionContext(
        { sub: 2, roles: ['admin'], permissions: ['system:user:create', 'system:user:delete'] },
        () => {},
      ),
    );
    expect(result).toBe(true);
  });

  it('should deny with ForbiddenException when permission missing', async () => {
    reflector.get.mockReturnValue(PERMISSIONS.USER_DELETE);
    await expect(
      guard.canActivate(
        createExecutionContext(
          { sub: 2, roles: ['admin'], permissions: ['system:user:create'] },
          () => {},
        ),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should deny when permissions array missing (treated as empty)', async () => {
    reflector.get.mockReturnValue(PERMISSIONS.USER_CREATE);
    await expect(
      guard.canActivate(
        createExecutionContext({ sub: 2, roles: ['admin'] }, () => {}),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should throw UnauthorizedException when req.user missing', async () => {
    reflector.get.mockReturnValue(PERMISSIONS.USER_CREATE);
    await expect(
      guard.canActivate(createExecutionContext(undefined, () => {})),
    ).rejects.toThrow(UnauthorizedException);
  });
});
