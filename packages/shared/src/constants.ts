import { ResultCode } from "./enums";

/**
 * 菜单/权限 key 常量
 * 用于前端路由守卫与按钮权限判断
 */
export const MENU_KEYS = {
  DASHBOARD: "dashboard",
  SYSTEM_USER: "system-user",
  SYSTEM_ROLE: "system-role",
  SYSTEM_MENU: "system-menu",
  SYSTEM_DEPT: "system-dept",
  SYSTEM_POSITION: "system-position",
  SYSTEM_DICT: "system-dict",
  MONITOR_ONLINE: "monitor-online",
  MONITOR_LOGIN_LOG: "monitor-login",
  MONITOR_OPERATION_LOG: "monitor-operation",
  MONITOR_SERVER: "monitor-server",
  TOOL_CODEGEN: "tool-codegen",
  TOOL_CONFIG: "tool-config",
} as const;

/**
 * 权限标识常量（按钮级）
 * 命名规范：模块:资源:动作
 */
export const PERMISSIONS = {
  USER_CREATE: "system:user:create",
  USER_UPDATE: "system:user:update",
  USER_DELETE: "system:user:delete",
  USER_RESET: "system:user:reset",
  USER_ASSIGN_ROLE: "system:user:assign-role",
  ROLE_CREATE: "system:role:create",
  ROLE_UPDATE: "system:role:update",
  ROLE_DELETE: "system:role:delete",
  ROLE_ASSIGN_PERMISSION: "system:role:assign-permission",
  MENU_CREATE: "system:menu:create",
  MENU_UPDATE: "system:menu:update",
  MENU_DELETE: "system:menu:delete",
} as const;

/**
 * 统一响应码对应的默认消息
 */
export const RESULT_MESSAGES: Record<number, string> = {
  [ResultCode.SUCCESS]: "操作成功",
  [ResultCode.FAIL]: "操作失败",
  [ResultCode.UNAUTHORIZED]: "未登录或登录已过期",
  [ResultCode.FORBIDDEN]: "没有访问权限",
  [ResultCode.NOT_FOUND]: "资源不存在",
  [ResultCode.VALIDATION_ERROR]: "参数校验失败",
  [ResultCode.SERVER_ERROR]: "服务器内部错误",
};

/**
 * LocalStorage 键
 */
export const STORAGE_KEYS = {
  TOKEN: "sekiro_token",
  REFRESH_TOKEN: "sekiro_refresh_token",
  LAYOUT: "sekiro-layout",
  THEME: "theme",
} as const;
