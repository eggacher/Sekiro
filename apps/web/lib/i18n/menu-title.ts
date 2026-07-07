import type { TranslationKey } from "./types";

const menuTitleKeyMap: Record<string, TranslationKey> = {
  "工作台": "menu.dashboard",
  "系统管理": "menu.systemManagement",
  "用户管理": "menu.userManagement",
  "角色管理": "menu.roleManagement",
  "菜单管理": "menu.menuManagement",
  "部门管理": "menu.deptManagement",
  "岗位管理": "menu.positionManagement",
  "数据字典": "menu.dictManagement",
  "系统监控": "menu.systemMonitor",
  "在线用户": "menu.onlineUsers",
  "登录日志": "menu.loginLogs",
  "操作日志": "menu.operationLogs",
  "服务监控": "menu.serverMonitor",
};

export function translateMenuTitle(t: (key: TranslationKey) => string, title: string): string {
  const key = menuTitleKeyMap[title];
  return key ? t(key) : title;
}
