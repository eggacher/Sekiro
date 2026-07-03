import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Menu as MenuIcon,
  Building2,
  Briefcase,
  BookMarked,
  MonitorDot,
  LogIn,
  FileClock,
  ServerCog,
  Code2,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type MenuItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  key: string;
  children?: MenuItem[];
};

export const menuItems: MenuItem[] = [
  {
    title: "工作台",
    href: "/",
    icon: LayoutDashboard,
    key: "dashboard",
  },
  {
    title: "系统管理",
    href: "#",
    icon: Settings,
    key: "system",
    children: [
      { title: "用户管理", href: "/system/user", icon: Users, key: "system-user" },
      { title: "角色管理", href: "/system/role", icon: ShieldCheck, key: "system-role" },
      { title: "菜单管理", href: "/system/menu", icon: MenuIcon, key: "system-menu" },
      { title: "部门管理", href: "/system/dept", icon: Building2, key: "system-dept" },
      { title: "岗位管理", href: "/system/position", icon: Briefcase, key: "system-position" },
      { title: "数据字典", href: "/system/dict", icon: BookMarked, key: "system-dict" },
    ],
  },
  {
    title: "系统监控",
    href: "#",
    icon: MonitorDot,
    key: "monitor",
    children: [
      { title: "在线用户", href: "/monitor/online", icon: Users, key: "monitor-online" },
      { title: "登录日志", href: "/monitor/login-log", icon: LogIn, key: "monitor-login" },
      { title: "操作日志", href: "/monitor/operation-log", icon: FileClock, key: "monitor-operation" },
      { title: "服务监控", href: "/monitor/server", icon: ServerCog, key: "monitor-server" },
    ],
  },
  {
    title: "系统工具",
    href: "#",
    icon: Code2,
    key: "tool",
    children: [
      { title: "代码生成器", href: "/tool/codegen", icon: Code2, key: "tool-codegen" },
      { title: "系统配置", href: "/tool/config", icon: Settings, key: "tool-config" },
    ],
  },
];

/**
 * 通过路径反查面包屑
 */
export function findBreadcrumb(pathname: string): { title: string; href: string }[] {
  const crumbs: { title: string; href: string }[] = [];
  for (const item of menuItems) {
    if (item.children) {
      const child = item.children.find((c) => c.href === pathname);
      if (child) {
        crumbs.push({ title: item.title, href: item.href });
        crumbs.push({ title: child.title, href: child.href });
        return crumbs;
      }
    } else if (item.href === pathname) {
      crumbs.push({ title: item.title, href: item.href });
      return crumbs;
    }
  }
  return crumbs;
}
