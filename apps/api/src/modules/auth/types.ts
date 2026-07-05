/**
 * 令牌载荷 - 访问令牌中的声明
 */
export interface TokenPayload {
  sub: number; // userId
  username: string;
  roles: string[];
  sid?: string; // sessionId
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
