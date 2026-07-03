/**
 * @sekiro/shared 的枚举与常量。
 *
 * 设计取舍：这里采用「字符串字面量联合类型」而非 TS 的 `enum`。
 * 理由：
 *   1. 前端 mock 数据天然是字面量（"enabled"），字面量联合与之零摩擦；
 *   2. 运行时零开销（enum 会生成额外代码）；
 *   3. 与后端 JSON 序列化天然兼容（后端传来字符串即可）。
 *   4. 仍是「单一来源」——所有取值在此集中定义。
 */

/**
 * 通用启停状态
 * 对应 DOMAIN_MODEL.md §4.1 用户账号状态机
 */
export type CommonStatus = "enabled" | "disabled";
export const CommonStatus = {
  ENABLED: "enabled",
  DISABLED: "disabled",
} as const satisfies { ENABLED: CommonStatus; DISABLED: CommonStatus };

/**
 * 数据权限范围
 * 对应 DOMAIN_MODEL.md §3.4 Role - DataScope 关联
 */
export type DataScopeType =
  | "all"
  | "dept_and_below"
  | "dept"
  | "self"
  | "custom";
export const DataScopeType = {
  ALL: "all",
  DEPT_AND_BELOW: "dept_and_below",
  DEPT_ONLY: "dept",
  SELF: "self",
  CUSTOM: "custom",
} as const satisfies Record<string, DataScopeType>;

/**
 * 菜单/权限节点类型
 * 对应 DOMAIN_MODEL.md §3.7 菜单 vs 权限的设计抉择（采用方案 A：单一类）
 */
export type MenuType = "directory" | "menu" | "button";
export const MenuType = {
  DIRECTORY: "directory",
  MENU: "menu",
  BUTTON: "button",
} as const satisfies Record<string, MenuType>;

/**
 * 登录结果
 */
export type LoginResult = "success" | "fail";
export const LoginResult = {
  SUCCESS: "success",
  FAIL: "fail",
} as const satisfies Record<string, LoginResult>;

/**
 * 操作日志类型
 */
export type OperationType =
  | "create"
  | "update"
  | "delete"
  | "export"
  | "other";
export const OperationType = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  EXPORT: "export",
  OTHER: "other",
} as const satisfies Record<string, OperationType>;

/**
 * 请求结果状态码（统一响应结构）
 * 这里用数字常量对象（运行时需要用到具体数值）
 */
export const ResultCode = {
  SUCCESS: 0,
  FAIL: 1,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  SERVER_ERROR: 500,
} as const;

export type ResultCode = (typeof ResultCode)[keyof typeof ResultCode];
