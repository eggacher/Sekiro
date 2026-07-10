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
 * 超级管理员角色编码（guard 与前端 hook 绕过权限判断时使用）
 */
export const SUPER_ADMIN_ROLE = "super_admin";

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
  USER_ASSIGN_POSITION: "system:user:assign-position",
  USER_UPDATE_STATUS: "system:user:update-status",
  ROLE_CREATE: "system:role:create",
  ROLE_UPDATE: "system:role:update",
  ROLE_DELETE: "system:role:delete",
  ROLE_ASSIGN_PERMISSION: "system:role:assign-permission",
  ROLE_DATA_SCOPE: "system:role:data-scope",
  ROLE_UPDATE_STATUS: "system:role:update-status",
  MENU_CREATE: "system:menu:create",
  MENU_UPDATE: "system:menu:update",
  MENU_DELETE: "system:menu:delete",
  DEPT_CREATE: "system:dept:create",
  DEPT_UPDATE: "system:dept:update",
  DEPT_DELETE: "system:dept:delete",
  POSITION_CREATE: "system:position:create",
  POSITION_UPDATE: "system:position:update",
  POSITION_DELETE: "system:position:delete",
  DICT_CREATE: "system:dict:create",
  DICT_UPDATE: "system:dict:update",
  DICT_DELETE: "system:dict:delete",
  DICT_ITEM_CREATE: "system:dict-item:create",
  DICT_ITEM_UPDATE: "system:dict-item:update",
  DICT_ITEM_DELETE: "system:dict-item:delete",
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
