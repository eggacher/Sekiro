import type {
  CommonStatus,
  DataScopeType,
  MenuType,
  LoginResult,
  OperationType,
} from "./enums";

/**
 * 统一响应结构
 * 对应 PRD §4.8 F-BE-02
 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

/**
 * 分页结果
 */
export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 分页查询基础入参
 */
export interface PageQuery {
  page: number;
  pageSize: number;
  keyword?: string;
}

// ────────────────────────────────────────────────────────────
// 核心域：组织与权限治理（对应 DOMAIN_MODEL.md §3.1）
// ────────────────────────────────────────────────────────────

/** 用户 —— 对应领域类 User */
export interface User {
  id: number;
  username: string;
  nickname: string;
  email: string;
  phone: string;
  avatar?: string;
  deptId: number;
  deptName?: string;
  roleIds: number[];
  roleNames?: string[];
  positionIds?: number[];
  status: CommonStatus;
  lastLoginTime?: string;
  createdAt: string;
}

/** 角色 —— 对应领域类 Role */
export interface Role {
  id: number;
  name: string;
  code: string;
  description?: string;
  dataScope: DataScopeType;
  customDeptIds?: number[];
  status: CommonStatus;
  userCount: number;
  createdAt: string;
}

/** 菜单/权限节点 —— 对应领域类 Menu（含目录/菜单/按钮三态） */
export interface Menu {
  id: number;
  parentId: number | null;
  title: string;
  type: MenuType;
  path?: string;
  component?: string;
  icon?: string;
  permission?: string;
  sort: number;
  visible: boolean;
  cache: boolean;
  status: CommonStatus;
  children?: Menu[];
}

/** 部门 —— 对应领域类 Department（树形自关联） */
export interface Dept {
  id: number;
  parentId: number | null;
  name: string;
  leader?: string;
  phone?: string;
  sort: number;
  status: CommonStatus;
  children?: Dept[];
}

/** 岗位 —— 对应领域类 Position */
export interface Position {
  id: number;
  name: string;
  code: string;
  sort: number;
  status: CommonStatus;
  createdAt: string;
}

// ────────────────────────────────────────────────────────────
// 支撑域：系统配置（对应 DOMAIN_MODEL.md §3.1 支撑域）
// ────────────────────────────────────────────────────────────

/** 字典类型 */
export interface DictType {
  id: number;
  name: string;
  code: string;
  status: CommonStatus;
  remark?: string;
  createdAt: string;
}

/** 字典项 */
export interface DictItem {
  id: number;
  typeId: number;
  label: string;
  value: string;
  sort: number;
  status: CommonStatus;
}

/** 系统参数 */
export interface SystemConfig {
  key: string;
  value: string;
  remark?: string;
}

// ────────────────────────────────────────────────────────────
// 通用域：认证与可观测（对应 DOMAIN_MODEL.md §3.1 通用域）
// ────────────────────────────────────────────────────────────

/** 登录请求 */
export interface LoginRequest {
  username: string;
  password: string;
  captcha?: string;
  captchaId?: string;
  remember?: boolean;
}

/** 登录响应 */
export interface LoginResponse {
  token: string;
  refreshToken?: string;
  expiresIn: number;
  user: Omit<User, "createdAt">;
  permissions: string[];
  menus: Menu[];
}

/** 会话 —— 对应领域类 Session */
export interface Session {
  id: string;
  userId: number;
  username: string;
  nickname: string;
  token: string;
  ip: string;
  location?: string;
  browser?: string;
  os?: string;
  loginTime: string;
  expireTime: string;
  lastActiveTime: string;
}

/** 登录日志 —— 对应领域类 LoginLog */
export interface LoginLog {
  id: number;
  username: string;
  ip: string;
  location?: string;
  browser?: string;
  os?: string;
  result: LoginResult;
  message: string;
  time: string;
}

/** 操作日志 —— 对应领域类 OperationLog */
export interface OperationLog {
  id: number;
  operator: string;
  module: string;
  type: OperationType;
  description: string;
  method: string;
  url: string;
  ip: string;
  cost: number;
  status: CommonStatus;
  time: string;
}

/** 当前登录用户信息 */
export interface CurrentUser {
  id: number;
  username: string;
  nickname: string;
  avatar?: string;
  email?: string;
  phone?: string;
  roles: string[];
  permissions: string[];
}

/** 刷新令牌请求 */
export interface RefreshRequest {
  refreshToken: string;
}

/** 刷新令牌响应 */
export interface RefreshResponse {
  token: string;
  expiresIn: number;
}
