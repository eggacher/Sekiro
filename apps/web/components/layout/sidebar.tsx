"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft } from "lucide-react";
import type { Menu } from "@sekiro/shared";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store/app-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { useTranslation } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/types";
import { getMenuIcon } from "@/lib/menu-icon-map";
import { Logo } from "./logo";

function isMenuVisible(item: Menu): boolean {
  return item.visible && item.status === "enabled" && item.type !== "button";
}

function buildSidebarMenus(menus: Menu[]): Menu[] {
  return menus
    .filter(isMenuVisible)
    .map((item) => ({
      ...item,
      children: item.children ? buildSidebarMenus(item.children) : undefined,
    }));
}

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

function translateMenuTitle(t: (key: TranslationKey) => string, title: string): string {
  const key = menuTitleKeyMap[title];
  return key ? t(key) : title;
}

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggleCollapsed } = useAppStore();
  const { menus } = useAuthStore();
  const { t } = useTranslation();
  const visibleMenus = buildSidebarMenus(menus);

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-300",
        collapsed ? "w-[64px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Logo collapsed={collapsed} />
      </div>

      {/* Menu */}
      <nav className="scrollbar-thin flex-1 overflow-y-auto px-2 py-3">
        {visibleMenus.map((item) => (
          <SidebarItem key={item.id} item={item} pathname={pathname} collapsed={collapsed} />
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t p-2">
        <button
          onClick={toggleCollapsed}
          title={collapsed ? t("nav.expand") : t("nav.collapse")}
          className="flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronsLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          {!collapsed && <span>{t("nav.collapse")}</span>}
        </button>
      </div>
    </aside>
  );
}

function SidebarItem({
  item,
  pathname,
  collapsed,
}: {
  item: Menu;
  pathname: string;
  collapsed: boolean;
}) {
  const hasChildren = !!item.children?.length;
  const href = item.path || "#";
  const isActive = pathname === href;
  const isChildActive = item.children?.some((c) => pathname.startsWith(c.path || "#"));
  const Icon = getMenuIcon(item.icon);
  const { t } = useTranslation();
  const title = translateMenuTitle(t, item.title);

  // 单层菜单
  if (!hasChildren) {
    return (
      <Link
        href={href}
        title={collapsed ? title : undefined}
        className={cn(
          "mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
          collapsed && "justify-center px-0"
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        {!collapsed && <span>{title}</span>}
      </Link>
    );
  }

  // 多层菜单（手风琴展开）
  return (
    <div className="mb-1">
      <div
        title={collapsed ? title : undefined}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground",
          collapsed && "justify-center px-0"
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        {!collapsed && <span className="flex-1">{title}</span>}
      </div>
      {!collapsed && (
        <div className="ml-[18px] mt-1 border-l pl-3">
          {item.children!.map((child) => {
            const ChildIcon = getMenuIcon(child.icon);
            const childHref = child.path || "#";
            const active = pathname === childHref;
            return (
              <Link
                key={child.id}
                href={childHref}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] transition-colors",
                  active
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  isChildActive && !active && "text-foreground"
                )}
              >
                <ChildIcon className="h-4 w-4 shrink-0" />
                <span>{translateMenuTitle(t, child.title)}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
