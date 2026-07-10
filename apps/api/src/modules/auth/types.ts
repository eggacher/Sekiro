/**
 * 令牌载荷 - 访问令牌中的声明
 */
export interface TokenPayload {
  sub: number; // userId
  username: string;
  roles: string[];
  sid?: string; // sessionId
  type?: 'access' | 'mfa';
  iat: number;
  exp: number;
}

/**
 * 刷新令牌载荷 - 刷新令牌中的声明
 */
export interface RefreshTokenPayload {
  sub: number;
  username: string;
  type: 'refresh';
  iat: number;
  exp: number;
}

/**
 * 多因素认证令牌载荷 - MFA 令牌中的声明
 */
export interface MfaTokenPayload {
  sub: number; // userId
  username: string;
  remember?: boolean;
  type: 'mfa';
  iat: number;
  exp: number;
}

/**
 * 会话对象 - 用于跟踪用户登录会话信息
 */
export interface Session {
  userId: number;
  username: string;
  token: string;
  refreshToken: string;
  remember: boolean;
  ip: string;
  userAgent: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
}

/**
 * 登录失败记录 - 用于防暴力破解
 */
export interface LoginFailureRecord {
  userId: number;
  failureCount: number;
  lockedUntil?: Date;
}

/**
 * 数据权限对象 - 存储合并后的数据可见性权限
 */
export interface UserDataScope {
  userId: number;
  isAll: boolean;
  isSelf: boolean;
  deptIds: number[];
}
