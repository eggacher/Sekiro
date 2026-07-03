import type { CommonStatus, LoginResult, OperationType } from "@sekiro/shared";

export type MockOnlineUser = {
  id: number;
  username: string;
  nickname: string;
  ip: string;
  location: string;
  browser: string;
  os: string;
  loginTime: string;
  lastActive: string;
};

export const mockOnlineUsers: MockOnlineUser[] = [
  { id: 1, username: "admin", nickname: "超级管理员", ip: "192.168.1.100", location: "内网", browser: "Chrome 126", os: "macOS", loginTime: "2026-07-04 09:12:33", lastActive: "刚刚" },
  { id: 2, username: "zhangsan", nickname: "张三", ip: "10.0.12.45", location: "北京", browser: "Chrome 125", os: "Windows 11", loginTime: "2026-07-04 08:45:21", lastActive: "1 分钟前" },
  { id: 3, username: "lisi", nickname: "李四", ip: "114.114.211.18", location: "上海", browser: "Safari 17", os: "macOS", loginTime: "2026-07-04 09:01:14", lastActive: "30 秒前" },
  { id: 4, username: "qianqi", nickname: "钱七", ip: "120.78.45.223", location: "杭州", browser: "Edge 126", os: "Windows 10", loginTime: "2026-07-04 07:55:30", lastActive: "3 分钟前" },
  { id: 5, username: "zhoujiu", nickname: "周九", ip: "192.168.2.88", location: "内网", browser: "Firefox 127", os: "Ubuntu", loginTime: "2026-07-04 09:01:14", lastActive: "刚刚" },
];

export type MockLoginLog = {
  id: number;
  username: string;
  ip: string;
  location: string;
  browser: string;
  os: string;
  status: LoginResult;
  message: string;
  time: string;
};

export const mockLoginLogs: MockLoginLog[] = [
  { id: 1, username: "admin", ip: "192.168.1.100", location: "内网", browser: "Chrome 126", os: "macOS", status: "success", message: "登录成功", time: "2026-07-04 09:12:33" },
  { id: 2, username: "zhangsan", ip: "10.0.12.45", location: "北京", browser: "Chrome 125", os: "Windows 11", status: "success", message: "登录成功", time: "2026-07-04 08:45:21" },
  { id: 3, username: "lisi", ip: "114.114.211.18", location: "上海", browser: "Safari 17", os: "macOS", status: "success", message: "登录成功", time: "2026-07-04 09:01:14" },
  { id: 4, username: "unknown", ip: "45.33.21.5", location: "海外", browser: "Chrome", os: "Unknown", status: "fail", message: "用户名或密码错误", time: "2026-07-04 08:30:11" },
  { id: 5, username: "qianqi", ip: "120.78.45.223", location: "杭州", browser: "Edge 126", os: "Windows 10", status: "success", message: "登录成功", time: "2026-07-04 07:55:30" },
  { id: 6, username: "admin", ip: "192.168.1.100", location: "内网", browser: "Chrome 126", os: "macOS", status: "fail", message: "验证码错误", time: "2026-07-04 07:50:01" },
  { id: 7, username: "wangwu", ip: "10.0.12.50", location: "深圳", browser: "Chrome 124", os: "Windows 11", status: "success", message: "登录成功", time: "2026-07-03 22:18:00" },
  { id: 8, username: "unknown", ip: "193.27.14.88", location: "海外", browser: "curl", os: "Unknown", status: "fail", message: "账号不存在", time: "2026-07-03 21:45:33" },
  { id: 9, username: "sunba", ip: "192.168.2.91", location: "内网", browser: "Firefox 127", os: "Ubuntu", status: "success", message: "登录成功", time: "2026-07-03 18:33:11" },
  { id: 10, username: "zhengshi", ip: "10.0.13.7", location: "广州", browser: "Chrome 125", os: "Windows 10", status: "success", message: "登录成功", time: "2026-07-03 20:33:50" },
  { id: 11, username: "admin", ip: "192.168.1.100", location: "内网", browser: "Chrome 126", os: "macOS", status: "success", message: "退出成功", time: "2026-07-03 17:00:00" },
  { id: 12, username: "lisi", ip: "114.114.211.18", location: "上海", browser: "Safari 17", os: "macOS", status: "success", message: "登录成功", time: "2026-07-03 14:22:08" },
];

export type MockOperationLog = {
  id: number;
  operator: string;
  module: string;
  type: OperationType;
  description: string;
  method: string;
  url: string;
  ip: string;
  cost: number;
  status: "success" | "fail";
  time: string;
};

export const mockOperationLogs: MockOperationLog[] = [
  { id: 1, operator: "admin", module: "用户管理", type: "create", description: "新增用户：liushisan", method: "POST", url: "/api/system/user", ip: "192.168.1.100", cost: 86, status: "success", time: "2026-07-04 09:30:11" },
  { id: 2, operator: "zhangsan", module: "角色管理", type: "update", description: "修改角色权限：管理员", method: "PUT", url: "/api/system/role/2/permission", ip: "10.0.12.45", cost: 124, status: "success", time: "2026-07-04 09:25:45" },
  { id: 3, operator: "admin", module: "菜单管理", type: "create", description: "新增菜单：通知中心", method: "POST", url: "/api/system/menu", ip: "192.168.1.100", cost: 65, status: "success", time: "2026-07-04 09:18:33" },
  { id: 4, operator: "lisi", module: "用户管理", type: "export", description: "导出用户列表", method: "GET", url: "/api/system/user/export", ip: "114.114.211.18", cost: 1450, status: "success", time: "2026-07-04 09:05:22" },
  { id: 5, operator: "admin", module: "部门管理", type: "delete", description: "删除部门：测试组", method: "DELETE", url: "/api/system/dept/1013", ip: "192.168.1.100", cost: 92, status: "success", time: "2026-07-04 08:50:11" },
  { id: 6, operator: "wangwu", module: "字典管理", type: "update", description: "修改字典项：用户性别", method: "PUT", url: "/api/system/dict/item", ip: "10.0.12.50", cost: 78, status: "success", time: "2026-07-04 08:33:00" },
  { id: 7, operator: "zhangsan", module: "用户管理", type: "update", description: "停用账号：zhaoliu", method: "PUT", url: "/api/system/user/5/status", ip: "10.0.12.45", cost: 56, status: "success", time: "2026-07-04 08:12:18" },
  { id: 8, operator: "admin", module: "系统配置", type: "update", description: "修改站点名称", method: "PUT", url: "/api/system/config", ip: "192.168.1.100", cost: 110, status: "fail", time: "2026-07-04 07:45:30" },
  { id: 9, operator: "lisi", module: "角色管理", type: "create", description: "新增角色：审计员", method: "POST", url: "/api/system/role", ip: "114.114.211.18", cost: 134, status: "success", time: "2026-07-03 22:01:55" },
  { id: 10, operator: "admin", module: "用户管理", type: "delete", description: "删除用户：test_account", method: "DELETE", url: "/api/system/user/99", ip: "192.168.1.100", cost: 70, status: "success", time: "2026-07-03 21:30:00" },
];

export const serverInfo = {
  hostname: "sekiro-prod-01",
  os: "Ubuntu 22.04 LTS",
  arch: "x86_64",
  cpuCores: 8,
  cpuUsage: 34.6,
  memoryTotal: 16 * 1024, // MB
  memoryUsed: 9.2 * 1024,
  diskTotal: 500, // GB
  diskUsed: 213,
  jvmVersion: "OpenJDK 17.0.11",
  jvmMemoryMax: 2048, // MB
  jvmMemoryUsed: 856,
  uptime: "12 天 4 小时",
  networkRx: 1.2, // MB/s
  networkTx: 0.6,
};

// 服务监控的近 60 秒指标曲线
export const cpuTrend = Array.from({ length: 30 }, (_, i) => ({
  time: `${i * 2}s`,
  cpu: Math.round(20 + Math.random() * 40),
  memory: Math.round(50 + Math.random() * 30),
}));

// 代码生成器的表
export type MockTable = {
  id: number;
  tableName: string;
  comment: string;
  columns: number;
  engine: string;
};

export const mockTables: MockTable[] = [
  { id: 1, tableName: "sys_user", comment: "用户信息表", columns: 12, engine: "InnoDB" },
  { id: 2, tableName: "sys_role", comment: "角色信息表", columns: 8, engine: "InnoDB" },
  { id: 3, tableName: "sys_menu", comment: "菜单权限表", columns: 14, engine: "InnoDB" },
  { id: 4, tableName: "sys_dept", comment: "部门表", columns: 9, engine: "InnoDB" },
  { id: 5, tableName: "sys_position", comment: "岗位表", columns: 7, engine: "InnoDB" },
  { id: 6, tableName: "sys_dict", comment: "字典类型表", columns: 8, engine: "InnoDB" },
  { id: 7, tableName: "sys_log_login", comment: "登录日志表", columns: 11, engine: "InnoDB" },
  { id: 8, tableName: "sys_log_operation", comment: "操作日志表", columns: 13, engine: "InnoDB" },
  { id: 9, tableName: "biz_order", comment: "订单表", columns: 18, engine: "InnoDB" },
  { id: 10, tableName: "biz_product", comment: "商品表", columns: 15, engine: "InnoDB" },
];
