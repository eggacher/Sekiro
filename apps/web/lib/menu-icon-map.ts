import type { LucideIcon } from "lucide-react";
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
  Circle,
} from "lucide-react";

/**
 * 将后端菜单 icon 字段（字符串）映射到 lucide-react 组件。
 * 名称约定与后端菜单管理中的 icon 字段保持一致。
 */
export const menuIconMap: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  users: Users,
  "shield-check": ShieldCheck,
  menu: MenuIcon,
  "building-2": Building2,
  briefcase: Briefcase,
  "book-marked": BookMarked,
  "monitor-dot": MonitorDot,
  "log-in": LogIn,
  "file-clock": FileClock,
  "server-cog": ServerCog,
  "code-2": Code2,
  settings: Settings,
};

/**
 * 根据图标名获取对应的 lucide 组件，未匹配时返回默认占位图标。
 */
export function getMenuIcon(name?: string): LucideIcon {
  if (!name) return Circle;
  return menuIconMap[name] ?? Circle;
}
