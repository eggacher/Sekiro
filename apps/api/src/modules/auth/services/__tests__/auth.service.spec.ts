import { describe, it, expect, beforeEach, vi } from "vitest";
import { AuthService } from "../auth.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { JwtProvider } from "../../providers/jwt.provider";
import { RedisSessionProvider } from "../../providers/redis-session.provider";
import { LoginFailureProvider } from "../../providers/login-failure.provider";
import { md5 } from "../../../../common/utils/crypto.util";
import { MfaService } from "../mfa.service";
import * as bcrypt from "bcrypt";

describe("AuthService", () => {
  let service: AuthService;
  let prismaService: any;
  let jwtProvider: any;
  let redisSessionProvider: any;
  let loginFailureProvider: any;
  let mfaService: any;

  beforeEach(() => {
    prismaService = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      loginLog: {
        create: vi.fn(),
      },
      userRole: {
        findMany: vi.fn(),
      },
      roleMenu: {
        findMany: vi.fn(),
      },
      menu: {
        findMany: vi.fn(),
      },
    };

    jwtProvider = {
      signToken: vi
        .fn()
        .mockReturnValue({ token: "jwt.token", expiresIn: 7200 }),
      signRefreshToken: vi
        .fn()
        .mockReturnValue({ refreshToken: "rt.token", expiresIn: 2592000 }),
      verifyRefreshToken: vi.fn(),
      signMfaToken: vi.fn().mockReturnValue({ mfaToken: "mfa.token", expiresIn: 300 }),
      verifyMfaToken: vi.fn(),
    };

    redisSessionProvider = {
      createSession: vi.fn(),
      deleteSession: vi.fn(),
      getSession: vi.fn(),
      updateSession: vi.fn(),
    };

    loginFailureProvider = {
      incrementFailure: vi.fn(),
      isLocked: vi.fn().mockResolvedValue(false),
      lockUser: vi.fn(),
      clearFailure: vi.fn(),
      getMaxFailures: vi.fn().mockReturnValue(5),
      getFailureTtl: vi.fn().mockReturnValue(1800),
    };

    mfaService = {
      verifyLogin: vi.fn(),
    };

    service = new AuthService(
      prismaService,
      jwtProvider,
      redisSessionProvider,
      loginFailureProvider,
      mfaService,
    );
  });

  describe("login", () => {
    it("should successfully login with correct credentials", async () => {
      const loginRequest = {
        username: "admin",
        password: md5("admin123"),
        remember: false,
      };
      const hashedPassword = await bcrypt.hash(md5("admin123"), 10);

      prismaService.user.findUnique.mockResolvedValueOnce({
        id: 1,
        username: "admin",
        passwordHash: hashedPassword,
        nickname: "Administrator",
        email: "admin@example.com",
        phone: null,
        avatar: null,
        status: "enabled",
        deptId: 1,
        roles: [],
      });

      // Mock for getUserPermissions
      prismaService.userRole.findMany.mockResolvedValueOnce([{ roleId: 1 }]);
      prismaService.roleMenu.findMany.mockResolvedValueOnce([
        { menuId: 1 },
        { menuId: 2 },
      ]);
      prismaService.menu.findMany.mockResolvedValueOnce([
        { id: 1, permission: "system:user:list", type: "button" },
      ]);
      // Mock for buildMenuTree
      prismaService.userRole.findMany.mockResolvedValueOnce([{ roleId: 1 }]);
      prismaService.roleMenu.findMany.mockResolvedValueOnce([
        { menuId: 1 },
        { menuId: 2 },
      ]);
      prismaService.menu.findMany.mockResolvedValueOnce([
        {
          id: 1,
          parentId: null,
          title: "User Management",
          type: "menu",
          sort: 1,
          visible: true,
          status: "enabled",
        },
        {
          id: 2,
          parentId: 1,
          title: "Users",
          type: "menu",
          sort: 1,
          visible: true,
          status: "enabled",
        },
      ]);

      const result = await service.login(
        loginRequest,
        "127.0.0.1",
        "Mozilla/5.0",
      );

      expect(result.code).toBe(0);
      expect(result.data?.token).toBe("jwt.token");
      expect(result.data?.refreshToken).toBe("rt.token");
      expect(result.data?.user?.username).toBe("admin");
      expect(result.data?.permissions).toContain("system:user:list");
    });

    it("should return error if user not found", async () => {
      const loginRequest = { username: "nonexistent", password: "pwd" };
      prismaService.user.findUnique.mockResolvedValueOnce(null);

      const result = await service.login(loginRequest, "127.0.0.1", "UA");

      expect(result.code).toBe(1);
      expect(result.message).toContain("账号或密码错误");
      expect(prismaService.loginLog.create).toHaveBeenCalled();
    });

    it("should return error if user status is disabled", async () => {
      const loginRequest = { username: "admin", password: md5("admin123") };
      prismaService.user.findUnique.mockResolvedValueOnce({
        id: 1,
        username: "admin",
        status: "disabled",
      });

      const result = await service.login(loginRequest, "127.0.0.1", "UA");

      expect(result.code).toBe(1);
      expect(result.message).toContain("已停用");
    });

    it("should return error if account is locked", async () => {
      const loginRequest = { username: "admin", password: md5("admin123") };
      prismaService.user.findUnique.mockResolvedValueOnce({
        id: 1,
        username: "admin",
        status: "enabled",
      });
      loginFailureProvider.isLocked.mockResolvedValueOnce(true);

      const result = await service.login(loginRequest, "127.0.0.1", "UA");

      expect(result.code).toBe(1);
      expect(result.message).toContain("已锁定");
    });

    it("should increment failure and lock after 5 attempts", async () => {
      const loginRequest = { username: "admin", password: md5("wrongpwd") };
      const correctHash = await bcrypt.hash(md5("correctpwd"), 10);
      prismaService.user.findUnique.mockResolvedValueOnce({
        id: 1,
        username: "admin",
        passwordHash: correctHash,
        status: "enabled",
      });
      loginFailureProvider.isLocked.mockResolvedValueOnce(false);
      loginFailureProvider.incrementFailure.mockResolvedValueOnce(5);

      const result = await service.login(loginRequest, "127.0.0.1", "UA");

      expect(result.code).toBe(1);
      expect(loginFailureProvider.lockUser).toHaveBeenCalledWith(1, 1800);
    });

    it("should show remaining attempts after password error", async () => {
      const loginRequest = { username: "admin", password: md5("wrongpwd") };
      const correctHash = await bcrypt.hash(md5("correctpwd"), 10);
      prismaService.user.findUnique.mockResolvedValueOnce({
        id: 1,
        username: "admin",
        passwordHash: correctHash,
        status: "enabled",
      });
      loginFailureProvider.isLocked.mockResolvedValueOnce(false);
      loginFailureProvider.incrementFailure.mockResolvedValueOnce(2);
      loginFailureProvider.getMaxFailures.mockReturnValue(5);

      const result = await service.login(loginRequest, "127.0.0.1", "UA");

      expect(result.code).toBe(1);
      expect(result.message).toContain("3 次");
    });

    it("should clear failure count on successful login", async () => {
      const loginRequest = { username: "admin", password: md5("admin123") };
      const hashedPassword = await bcrypt.hash(md5("admin123"), 10);

      prismaService.user.findUnique.mockResolvedValueOnce({
        id: 1,
        username: "admin",
        passwordHash: hashedPassword,
        nickname: "Admin",
        email: "admin@example.com",
        phone: null,
        avatar: null,
        status: "enabled",
        deptId: 1,
        roles: [],
      });

      prismaService.userRole.findMany
        .mockResolvedValueOnce([]) // for getUserPermissions
        .mockResolvedValueOnce([]); // for buildMenuTree
      prismaService.menu.findMany
        .mockResolvedValueOnce([]) // for getUserPermissions
        .mockResolvedValueOnce([]); // for buildMenuTree

      await service.login(loginRequest, "127.0.0.1", "UA");

      expect(loginFailureProvider.clearFailure).toHaveBeenCalledWith(1);
    });

    it("should create session with correct TTL", async () => {
      const loginRequest = { username: "admin", password: md5("admin123") };
      const hashedPassword = await bcrypt.hash(md5("admin123"), 10);

      prismaService.user.findUnique.mockResolvedValueOnce({
        id: 1,
        username: "admin",
        passwordHash: hashedPassword,
        nickname: "Admin",
        email: "admin@example.com",
        phone: null,
        avatar: null,
        status: "enabled",
        deptId: 1,
        roles: [],
      });

      prismaService.userRole.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      prismaService.menu.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.login(loginRequest, "127.0.0.1", "UA");

      expect(redisSessionProvider.createSession).toHaveBeenCalled();
      const [sessionId, session, ttl] =
        redisSessionProvider.createSession.mock.calls[0];
      expect(ttl).toBe(2592000); // 30 days
      expect(session.userId).toBe(1);
      expect(session.token).toBe("jwt.token");
    });

    it("should write success login log", async () => {
      const loginRequest = { username: "admin", password: md5("admin123") };
      const hashedPassword = await bcrypt.hash(md5("admin123"), 10);

      prismaService.user.findUnique.mockResolvedValueOnce({
        id: 1,
        username: "admin",
        passwordHash: hashedPassword,
        nickname: "Admin",
        email: "admin@example.com",
        phone: null,
        avatar: null,
        status: "enabled",
        deptId: 1,
        roles: [],
      });

      prismaService.userRole.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      prismaService.menu.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      await service.login(loginRequest, "127.0.0.1", "Mozilla/5.0");

      const logs = prismaService.loginLog.create.mock.calls;
      const successLog = logs[logs.length - 1][0].data;
      expect(successLog.result).toBe("success");
      expect(successLog.username).toBe("admin");
    });

    it("should parse and truncate long User-Agent correctly to protect DB constraints", async () => {
      const loginRequest = { username: "admin", password: "admin123" };
      const hashedPassword = await bcrypt.hash("admin123", 10);

      prismaService.user.findUnique.mockResolvedValueOnce({
        id: 1,
        username: "admin",
        passwordHash: hashedPassword,
        nickname: "Admin",
        email: "admin@example.com",
        phone: null,
        avatar: null,
        status: "enabled",
        deptId: 1,
        roles: [],
      });

      prismaService.userRole.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      prismaService.menu.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const longUa = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36";
      await service.login(loginRequest, "127.0.0.1", longUa);

      const logs = prismaService.loginLog.create.mock.calls;
      const successLog = logs[logs.length - 1][0].data;
      expect(successLog.result).toBe("success");
      expect(successLog.browser).toBe("Chrome 150");
      expect(successLog.os).toBe("macOS 10.15.7");
      expect(successLog.browser.length).toBeLessThanOrEqual(64);
      expect(successLog.os.length).toBeLessThanOrEqual(64);
    });

    it("登录成功应在 Session 中写入 permissions 与 roles，并在响应 user 中返回 roles", async () => {
      const hashedPassword = await bcrypt.hash("md5hash", 10);
      prismaService.user.findUnique.mockResolvedValueOnce({
        id: 2,
        username: "admin",
        passwordHash: hashedPassword,
        status: "enabled",
        mfaEnabled: false,
        nickname: "Admin",
        email: null,
        phone: null,
        avatar: null,
        deptId: 1,
        roles: [{ role: { code: "admin" } }],
      });
      prismaService.userRole.findMany.mockResolvedValueOnce([{ roleId: 2 }]);
      prismaService.roleMenu.findMany.mockResolvedValueOnce([{ menuId: 211 }]);
      prismaService.menu.findMany.mockResolvedValueOnce([
        { permission: "system:user:create" },
      ]);
      prismaService.userRole.findMany.mockResolvedValueOnce([]);

      const result = await service.login(
        { username: "admin", password: "md5hash" } as any,
        "127.0.0.1",
        "Mozilla/5.0",
      );

      expect(redisSessionProvider.createSession).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          permissions: ["system:user:create"],
          roles: ["admin"],
        }),
        2592000,
      );
      expect(result.data.user.roles).toEqual(["admin"]);
    });
  });

  describe("refresh", () => {
    it("should return new token if refreshToken is valid", async () => {
      jwtProvider.verifyRefreshToken.mockReturnValueOnce({
        sub: 1,
        username: "admin",
        type: "refresh",
      });

      const result = await service.refresh("valid.refresh.token");

      expect(result.code).toBe(0);
      expect(result.data?.token).toBe("jwt.token");
      expect(result.data?.expiresIn).toBe(7200);
    });

    it("should return error if refreshToken is invalid", async () => {
      jwtProvider.verifyRefreshToken.mockReturnValueOnce(null);

      const result = await service.refresh("invalid.token");

      expect(result.code).toBe(401);
      expect(result.message).toContain("过期或无效");
    });
  });

  describe("logout", () => {
    it("should delete session and clear failure", async () => {
      await service.logout(1, "session-123");

      expect(redisSessionProvider.deleteSession).toHaveBeenCalledWith(
        "session-123",
      );
      expect(loginFailureProvider.clearFailure).toHaveBeenCalledWith(1);
    });

    it("should clear failure even without sessionId", async () => {
      await service.logout(1);

      expect(loginFailureProvider.clearFailure).toHaveBeenCalledWith(1);
    });
  });

  describe("getMe", () => {
    it("should return current user with mfaEnabled", async () => {
      prismaService.user.findUnique.mockResolvedValueOnce({
        id: 1,
        username: "admin",
        nickname: "Administrator",
        email: "admin@example.com",
        phone: null,
        avatar: null,
        mfaEnabled: true,
        roles: [{ role: { code: "admin" } }],
      });

      prismaService.userRole.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      prismaService.menu.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getMe(1);

      expect(result.user.id).toBe(1);
      expect(result.user.username).toBe("admin");
      expect(result.user.mfaEnabled).toBe(true);
    });

    it("should throw if user not found", async () => {
      prismaService.user.findUnique.mockResolvedValueOnce(null);

      await expect(service.getMe(999)).rejects.toThrow("用户不存在");
    });

    it("getMe 应将重算的 permissions 与 roles 回写到 Session", async () => {
      prismaService.user.findUnique.mockResolvedValueOnce({
        id: 2,
        username: "admin",
        nickname: "Admin",
        avatar: null,
        email: null,
        phone: null,
        mfaEnabled: false,
        roles: [{ role: { code: "admin" } }],
      });
      prismaService.userRole.findMany.mockResolvedValueOnce([{ roleId: 2 }]);
      prismaService.roleMenu.findMany.mockResolvedValueOnce([{ menuId: 211 }]);
      prismaService.menu.findMany.mockResolvedValueOnce([
        { permission: "system:user:create" },
      ]);
      prismaService.userRole.findMany.mockResolvedValueOnce([]);

      await service.getMe(2, "session-123");

      expect(redisSessionProvider.updateSession).toHaveBeenCalledWith("session-123", {
        permissions: ["system:user:create"],
        roles: ["admin"],
      });
    });
  });

  describe("getUserPermissions", () => {
    it("should return empty array if user has no roles", async () => {
      prismaService.userRole.findMany.mockResolvedValueOnce([]);

      const result = await service.getUserPermissions(1);

      expect(result).toEqual([]);
    });

    it("should return permissions from user roles", async () => {
      prismaService.userRole.findMany.mockResolvedValueOnce([
        { roleId: 1 },
        { roleId: 2 },
      ]);
      prismaService.roleMenu.findMany.mockResolvedValueOnce([
        { menuId: 1 },
        { menuId: 2 },
      ]);
      prismaService.menu.findMany.mockResolvedValueOnce([
        {
          id: 1,
          permission: "system:user:list",
          type: "button",
          status: "enabled",
        },
        {
          id: 2,
          permission: "system:user:create",
          type: "button",
          status: "enabled",
        },
      ]);

      const result = await service.getUserPermissions(1);

      expect(result).toEqual(["system:user:list", "system:user:create"]);
    });

    it("should only return button type permissions", async () => {
      prismaService.userRole.findMany.mockResolvedValueOnce([{ roleId: 1 }]);
      prismaService.roleMenu.findMany.mockResolvedValueOnce([
        { menuId: 1 },
        { menuId: 2 },
      ]);
      // Only return the button permission when filtering
      prismaService.menu.findMany.mockResolvedValueOnce([
        {
          id: 1,
          permission: "system:user:list",
          type: "button",
          status: "enabled",
        },
      ]);

      const result = await service.getUserPermissions(1);

      expect(result).toEqual(["system:user:list"]);
    });

    it("should exclude null permissions", async () => {
      prismaService.userRole.findMany.mockResolvedValueOnce([{ roleId: 1 }]);
      prismaService.roleMenu.findMany.mockResolvedValueOnce([{ menuId: 1 }]);
      prismaService.menu.findMany.mockResolvedValueOnce([
        { id: 1, permission: null, type: "button", status: "enabled" },
      ]);

      const result = await service.getUserPermissions(1);

      expect(result).toEqual([]);
    });
  });

  describe("buildMenuTree", () => {
    it("should return empty array if user has no roles", async () => {
      prismaService.userRole.findMany.mockResolvedValueOnce([]);

      const result = await service.buildMenuTree(1);

      expect(result).toEqual([]);
    });

    it("should build tree structure for user menus", async () => {
      prismaService.userRole.findMany.mockResolvedValueOnce([{ roleId: 1 }]);
      prismaService.roleMenu.findMany.mockResolvedValueOnce([
        { menuId: 1 },
        { menuId: 2 },
      ]);
      prismaService.menu.findMany.mockResolvedValueOnce([
        {
          id: 1,
          parentId: null,
          title: "System",
          sort: 1,
          visible: true,
          status: "enabled",
        },
        {
          id: 2,
          parentId: 1,
          title: "Users",
          sort: 1,
          visible: true,
          status: "enabled",
        },
      ]);

      const result = await service.buildMenuTree(1);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children?.[0].id).toBe(2);
    });

    it("should filter by enabled status", async () => {
      prismaService.userRole.findMany.mockResolvedValueOnce([{ roleId: 1 }]);
      prismaService.roleMenu.findMany.mockResolvedValueOnce([{ menuId: 1 }]);
      prismaService.menu.findMany.mockResolvedValueOnce([
        {
          id: 1,
          parentId: null,
          title: "System",
          sort: 1,
          visible: true,
          status: "enabled",
        },
      ]);

      const result = await service.buildMenuTree(1);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("System");
    });

    it("should respect sort order from database", async () => {
      prismaService.userRole.findMany.mockResolvedValueOnce([{ roleId: 1 }]);
      prismaService.roleMenu.findMany.mockResolvedValueOnce([
        { menuId: 1 },
        { menuId: 2 },
      ]);
      // Database returns items in sort order (sort=1 first, then sort=2)
      prismaService.menu.findMany.mockResolvedValueOnce([
        {
          id: 2,
          parentId: null,
          title: "First",
          sort: 1,
          visible: true,
          status: "enabled",
        },
        {
          id: 1,
          parentId: null,
          title: "Second",
          sort: 2,
          visible: true,
          status: "enabled",
        },
      ]);

      const result = await service.buildMenuTree(1);

      expect(result[0].id).toBe(2);
      expect(result[1].id).toBe(1);
    });
  });

  describe("login with MFA", () => {
    it("should return mfaRequired when MFA is enabled", async () => {
      const loginRequest = {
        username: "admin",
        password: "admin123",
        remember: false,
      };
      const hashedPassword = await bcrypt.hash("admin123", 10);

      prismaService.user.findUnique.mockResolvedValueOnce({
        id: 1,
        username: "admin",
        passwordHash: hashedPassword,
        nickname: "Administrator",
        email: "admin@example.com",
        phone: null,
        avatar: null,
        status: "enabled",
        deptId: 1,
        mfaEnabled: true,
      });

      jwtProvider.signMfaToken.mockReturnValueOnce({
        mfaToken: "mfa.token",
        expiresIn: 300,
      });

      const result = await service.login(loginRequest, "127.0.0.1", "UA");

      expect(result.code).toBe(0);
      expect(result.data.mfaRequired).toBe(true);
      expect(result.data.mfaToken).toBe("mfa.token");
      expect(redisSessionProvider.createSession).not.toHaveBeenCalled();
    });

    it("should return full login response when MFA is disabled", async () => {
      const loginRequest = {
        username: "admin",
        password: "admin123",
        remember: false,
      };
      const hashedPassword = await bcrypt.hash("admin123", 10);

      prismaService.user.findUnique.mockResolvedValueOnce({
        id: 1,
        username: "admin",
        passwordHash: hashedPassword,
        nickname: "Administrator",
        email: "admin@example.com",
        phone: null,
        avatar: null,
        status: "enabled",
        deptId: 1,
        mfaEnabled: false,
        roles: [],
      });

      prismaService.userRole.findMany.mockResolvedValueOnce([]);
      prismaService.menu.findMany.mockResolvedValueOnce([]);
      prismaService.userRole.findMany.mockResolvedValueOnce([]);
      prismaService.menu.findMany.mockResolvedValueOnce([]);

      jwtProvider.signToken.mockReturnValueOnce({ token: "jwt.token", expiresIn: 7200 });
      jwtProvider.signRefreshToken.mockReturnValueOnce({ refreshToken: "rt.token", expiresIn: 2592000 });

      const result = await service.login(loginRequest, "127.0.0.1", "UA");

      expect(result.code).toBe(0);
      expect(result.data.token).toBe("jwt.token");
      expect(result.data.mfaRequired).toBeUndefined();
    });
  });

  describe("loginWithMfa", () => {
    it("should return full login response after valid MFA code", async () => {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      const user = {
        id: 1,
        username: "admin",
        passwordHash: hashedPassword,
        nickname: "Administrator",
        email: "admin@example.com",
        phone: null,
        avatar: null,
        status: "enabled",
        deptId: 1,
        mfaEnabled: true,
        roles: [],
      };

      mfaService.verifyLogin.mockResolvedValueOnce({ code: 0, data: { user, payload: { sub: 1, username: 'admin', type: 'mfa', remember: false } } });
      prismaService.userRole.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      prismaService.menu.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      jwtProvider.signToken.mockReturnValueOnce({ token: "jwt.token", expiresIn: 7200 });
      jwtProvider.signRefreshToken.mockReturnValueOnce({ refreshToken: "rt.token", expiresIn: 2592000 });

      const result = await service.loginWithMfa("mfa.token", "123456", "127.0.0.1", "UA");

      expect(result.code).toBe(0);
      expect(result.data.token).toBe("jwt.token");
      expect(mfaService.verifyLogin).toHaveBeenCalledWith("mfa.token", "123456");
      expect(redisSessionProvider.createSession).toHaveBeenCalled();
      expect(prismaService.loginLog.create).toHaveBeenCalled();
    });

    it("should propagate MFA verification failure without creating session", async () => {
      mfaService.verifyLogin.mockResolvedValueOnce({ code: 1, message: "验证码错误或已过期" });

      const result = await service.loginWithMfa("mfa.token", "000000", "127.0.0.1", "UA");

      expect(result.code).toBe(1);
      expect(result.message).toBe("验证码错误或已过期");
      expect(jwtProvider.signToken).not.toHaveBeenCalled();
      expect(jwtProvider.signRefreshToken).not.toHaveBeenCalled();
      expect(redisSessionProvider.createSession).not.toHaveBeenCalled();
      expect(prismaService.loginLog.create).not.toHaveBeenCalled();
    });

    it("MFA 登录成功应在 Session 中写入 permissions 与 roles，并在响应 user 中返回 roles", async () => {
      mfaService.verifyLogin.mockResolvedValueOnce({
        code: 0,
        data: {
          user: {
            id: 2,
            username: "admin",
            nickname: "Admin",
            email: null,
            phone: null,
            avatar: null,
            status: "enabled",
            deptId: 1,
            roles: [{ role: { code: "admin" } }],
          },
          payload: { remember: false },
        },
      });
      prismaService.userRole.findMany.mockResolvedValueOnce([{ roleId: 2 }]);
      prismaService.roleMenu.findMany.mockResolvedValueOnce([{ menuId: 211 }]);
      prismaService.menu.findMany.mockResolvedValueOnce([
        { permission: "system:user:create" },
      ]);
      prismaService.userRole.findMany.mockResolvedValueOnce([]);

      const result = await service.loginWithMfa("mfa.token", "123456", "127.0.0.1", "Mozilla/5.0");

      expect(redisSessionProvider.createSession).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          permissions: ["system:user:create"],
          roles: ["admin"],
        }),
        2592000,
      );
      expect(result.data.user.roles).toEqual(["admin"]);
    });
  });
});
