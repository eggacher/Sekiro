import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JwtAuthGuard } from '../jwt-auth.guard';
import { UnauthorizedException } from '@nestjs/common';

function createExecutionContext(headers: Record<string, string>) {
  const request: any = { headers };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
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

  it('should attach session permissions and roles to req.user', async () => {
    jwtProvider.verifyToken.mockReturnValueOnce({
      sub: 1,
      username: 'admin',
      roles: ['system'],
      sid: 'session-1',
    });
    redisSessionProvider.getSession.mockResolvedValueOnce({
      permissions: ['system:user:create'],
      roles: ['super_admin'],
    });

    const ctx = createExecutionContext({ authorization: 'Bearer access.token' });
    await guard.canActivate(ctx);

    const req = ctx.switchToHttp().getRequest();
    expect(req.user.permissions).toEqual(['system:user:create']);
    expect(req.user.roles).toEqual(['super_admin']);
  });

  it('should default permissions/roles to empty when session lacks them', async () => {
    jwtProvider.verifyToken.mockReturnValueOnce({
      sub: 1,
      username: 'admin',
      sid: 'session-1',
    });
    redisSessionProvider.getSession.mockResolvedValueOnce({});

    const ctx = createExecutionContext({ authorization: 'Bearer access.token' });
    await guard.canActivate(ctx);

    const req = ctx.switchToHttp().getRequest();
    expect(req.user.permissions).toEqual([]);
    expect(req.user.roles).toEqual([]);
  });
});
