import {
  Injectable,
  Logger,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtProvider } from '../providers/jwt.provider';
import { RedisSessionProvider } from '../providers/redis-session.provider';
import { LoginFailureProvider } from '../providers/login-failure.provider';
import type { CurrentUser, LoginRequest, Menu } from '@sekiro/shared';

/**
 * 菜单树节点 - 用于递归构建菜单树
 */
interface MenuNode extends Menu {
  children?: MenuNode[];
}

/**
 * 业务编排服务
 * - 处理登录、刷新、登出的完整流程
 * - 计算用户权限和菜单树
 * - 管理会话和登录失败
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(PrismaService) private prismaService: PrismaService,
    @Inject(JwtProvider) private jwtProvider: JwtProvider,
    @Inject(RedisSessionProvider) private redisSessionProvider: RedisSessionProvider,
    @Inject(LoginFailureProvider) private loginFailureProvider: LoginFailureProvider,
  ) {}

  /**
   * 登录流程
   *
   * 1. 查询用户 → 不存在返回 code=1
   * 2. 检查状态 → disabled 返回 code=1
   * 3. 检查锁定 → 已锁定返回 code=1
   * 4. 验证密码 → 不符则失败计数 +1，5 次后锁定
   * 5. 成功 → 清除失败计数、计算权限、签发 Token、创建 Session、写日志
   */
  async login(
    request: LoginRequest,
    ipAddress: string,
    userAgent: string,
  ): Promise<any> {
    const { username, password, remember } = request;

    // 1. 查询用户
    const user = await this.prismaService.user.findUnique({
      where: { username },
    });
    if (!user) {
      await this.prismaService.loginLog.create({
        data: {
          username,
          result: 'fail',
          message: '账号不存在',
          ip: ipAddress,
          browser: this.parseBrowser(userAgent),
          os: this.parseOs(userAgent),
        },
      });
      return { code: 1, message: '账号或密码错误' };
    }

    // 2. 检查账号状态
    if (user.status === 'disabled') {
      await this.prismaService.loginLog.create({
        data: {
          username,
          result: 'fail',
          message: '账号已停用',
          ip: ipAddress,
          browser: this.parseBrowser(userAgent),
          os: this.parseOs(userAgent),
        },
      });
      return { code: 1, message: '账号已停用' };
    }

    // 3. 检查账号是否被锁定
    const isLocked = await this.loginFailureProvider.isLocked(user.id);
    if (isLocked) {
      await this.prismaService.loginLog.create({
        data: {
          username,
          result: 'fail',
          message: '账号已锁定',
          ip: ipAddress,
          browser: this.parseBrowser(userAgent),
          os: this.parseOs(userAgent),
        },
      });
      return { code: 1, message: '账号已锁定 30 分钟' };
    }

    // 4. 验证密码
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      const failureCount = await this.loginFailureProvider.incrementFailure(user.id);
      const maxFailures = this.loginFailureProvider.getMaxFailures();
      const remainTimes = maxFailures - failureCount;

      if (failureCount >= maxFailures) {
        const ttl = this.loginFailureProvider.getFailureTtl();
        await this.loginFailureProvider.lockUser(user.id, ttl);
      }

      await this.prismaService.loginLog.create({
        data: {
          username,
          result: 'fail',
          message: '密码错误',
          ip: ipAddress,
          browser: this.parseBrowser(userAgent),
          os: this.parseOs(userAgent),
        },
      });

      return {
        code: 1,
        message: remainTimes > 0 ? `密码错误，还剩 ${remainTimes} 次` : `密码错误，账号已锁定 30 分钟`,
      };
    }

    // 5. 验证成功！清除失败计数
    await this.loginFailureProvider.clearFailure(user.id);

    // 6. 计算权限和菜单
    const permissions = await this.getUserPermissions(user.id);
    const menus = await this.buildMenuTree(user.id);

    // 7. 创建 Session ID 并签发 Token
    const sessionId = uuidv4();
    const { token, expiresIn } = this.jwtProvider.signToken({
      sub: user.id,
      username: user.username,
      roles: permissions.map((p) => p.split(':')[0]).filter((v, i, a) => a.indexOf(v) === i),
      sid: sessionId,
    });

    const { refreshToken } = this.jwtProvider.signRefreshToken({
      sub: user.id,
      username: user.username,
    });

    // 8. 创建 Session
    const session = {
      userId: user.id,
      username: user.username,
      token,
      refreshToken,
      remember: remember || false,
      ip: ipAddress,
      userAgent,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    };
    await this.redisSessionProvider.createSession(sessionId, session, 2592000);

    // 9. 更新用户登录时间并写日志
    await this.prismaService.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    const parsedBrowser = this.parseBrowser(userAgent);
    const parsedOs = this.parseOs(userAgent);
    await this.prismaService.loginLog.create({
      data: {
        username,
        result: 'success',
        message: '登录成功',
        ip: ipAddress,
        browser: parsedBrowser,
        os: parsedOs,
      },
    });

    // 10. 返回响应
    return {
      code: 0,
      data: {
        token,
        refreshToken,
        expiresIn,
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          status: user.status,
          deptId: user.deptId,
        },
        permissions,
        menus,
      },
    };
  }

  /**
   * 刷新令牌流程
   *
   * 1. 验证 RefreshToken
   * 2. 如果有效，签发新 JWT
   * 3. 如果无效，返回 code=401
   */
  async refresh(refreshToken: string): Promise<any> {
    // 1. 验证 RefreshToken
    const payload = this.jwtProvider.verifyRefreshToken(refreshToken);
    if (!payload) {
      return { code: 401, message: 'Token 已过期或无效，请重新登录' };
    }

    // 2. 签发新 JWT
    const { token, expiresIn } = this.jwtProvider.signToken({
      sub: payload.sub,
      username: payload.username,
      roles: [],
    });

    return {
      code: 0,
      data: { token, expiresIn },
    };
  }

  /**
   * 获取当前登录用户信息
   *
   * 1. 查询用户
   * 2. 计算权限和菜单
   * 3. 组装 CurrentUser
   */
  async getMe(userId: number): Promise<{
    user: CurrentUser;
    permissions: string[];
    menus: MenuNode[];
  }> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    const permissions = await this.getUserPermissions(userId);
    const menus = await this.buildMenuTree(userId);
    const roles = user.roles.map((ur) => ur.role.code);

    return {
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar ?? undefined,
        email: user.email ?? undefined,
        phone: user.phone ?? undefined,
        roles,
        permissions,
      },
      permissions,
      menus,
    };
  }

  /**
   * 登出流程
   *
   * 1. 删除会话
   * 2. 清除登录失败计数
   */
  async logout(userId: number, sessionId?: string): Promise<void> {
    if (sessionId) {
      await this.redisSessionProvider.deleteSession(sessionId);
    }
    await this.loginFailureProvider.clearFailure(userId);
  }

  /**
   * 获取用户权限
   *
   * 1. 查询用户的所有角色
   * 2. 查询这些角色关联的所有菜单
   * 3. 提取 type='button' 的菜单权限字段
   * 4. 返回扁平数组
   */
  async getUserPermissions(userId: number): Promise<string[]> {
    const userRoles = await this.prismaService.userRole.findMany({
      where: {
        userId,
        role: {
          deletedAt: null,
          status: 'enabled',
        },
      },
    });

    if (userRoles.length === 0) {
      return [];
    }

    const roleIds = userRoles.map((ur) => ur.roleId);
    const roleMenus = await this.prismaService.roleMenu.findMany({
      where: { roleId: { in: roleIds } },
      distinct: ['menuId'],
    });

    const menuIds = roleMenus.map((rm) => rm.menuId);
    if (menuIds.length === 0) {
      return [];
    }

    const menus = await this.prismaService.menu.findMany({
      where: {
        id: { in: menuIds },
        type: 'button',
        status: 'enabled',
      },
    });

    return menus.map((m) => m.permission).filter(Boolean) as string[];
  }

  /**
   * 构建菜单树
   *
   * 1. 查询用户有权限的菜单
   * 2. 按 parent_id 递归构建树形结构
   */
  async buildMenuTree(userId: number): Promise<MenuNode[]> {
    const userRoles = await this.prismaService.userRole.findMany({
      where: {
        userId,
        role: {
          deletedAt: null,
          status: 'enabled',
        },
      },
    });

    if (userRoles.length === 0) {
      return [];
    }

    const roleIds = userRoles.map((ur) => ur.roleId);
    const roleMenus = await this.prismaService.roleMenu.findMany({
      where: { roleId: { in: roleIds } },
      distinct: ['menuId'],
    });

    const menuIds = roleMenus.map((rm) => rm.menuId);
    if (menuIds.length === 0) {
      return [];
    }

    const menus = await this.prismaService.menu.findMany({
      where: {
        id: { in: menuIds },
        status: 'enabled',
      },
      orderBy: { sort: 'asc' },
    });

    return this.buildTree(menus as MenuNode[]);
  }

  /**
   * 递归构建树形结构
   */
  private buildTree(items: MenuNode[], parentId: number | null = null): MenuNode[] {
    return items
      .filter((item) => item.parentId === parentId)
      .map((item) => ({
        ...item,
        children: this.buildTree(items, item.id),
      }));
  }

  /**
   * 从 User-Agent 字符串中解析浏览器名称
   */
  private parseBrowser(ua: string): string {
    if (!ua) return 'Unknown';
    const patterns: [RegExp, string][] = [
      [/Edg(?:e|A)?\/([\d.]+)/, 'Edge'],
      [/OPR\/([\d.]+)/, 'Opera'],
      [/Chrome\/([\d.]+)/, 'Chrome'],
      [/Firefox\/([\d.]+)/, 'Firefox'],
      [/Version\/([\d.]+).*Safari/, 'Safari'],
    ];
    for (const [regex, name] of patterns) {
      const match = ua.match(regex);
      if (match) {
        const version = match[1].split('.')[0];
        return `${name} ${version}`;
      }
    }
    return ua.substring(0, 64);
  }

  /**
   * 从 User-Agent 字符串中解析操作系统名称
   */
  private parseOs(ua: string): string {
    if (!ua) return 'Unknown';
    const patterns: [RegExp, string][] = [
      [/Windows NT 10\.0/, 'Windows 10'],
      [/Windows NT 6\.3/, 'Windows 8.1'],
      [/Windows NT 6\.1/, 'Windows 7'],
      [/Mac OS X ([\d._]+)/, 'macOS'],
      [/Android ([\d.]+)/, 'Android'],
      [/iPhone OS ([\d_]+)/, 'iOS'],
      [/Linux/, 'Linux'],
    ];
    for (const [regex, name] of patterns) {
      const match = ua.match(regex);
      if (match) {
        if (match[1]) {
          const version = match[1].replace(/_/g, '.');
          return `${name} ${version}`;
        }
        return name;
      }
    }
    return ua.substring(0, 64);
  }
}
