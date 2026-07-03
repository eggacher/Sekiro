"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store/app-store";
import { menuItems } from "@/lib/menu";
import { Logo } from "./logo";

export function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggleCollapsed } = useAppStore();

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
        {menuItems.map((item) => (
          <SidebarItem key={item.key} item={item} pathname={pathname} collapsed={collapsed} />
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t p-2">
        <button
          onClick={toggleCollapsed}
          className="flex w-full items-center justify-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <ChevronsLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          {!collapsed && <span>收起</span>}
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
  item: (typeof menuItems)[number];
  pathname: string;
  collapsed: boolean;
}) {
  const hasChildren = !!item.children?.length;
  const isActive = pathname === item.href;
  const isChildActive = item.children?.some((c) => pathname.startsWith(c.href));
  const Icon = item.icon;

  // 单层菜单
  if (!hasChildren) {
    return (
      <Link
        href={item.href}
        title={collapsed ? item.title : undefined}
        className={cn(
          "mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
          collapsed && "justify-center px-0"
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        {!collapsed && <span>{item.title}</span>}
      </Link>
    );
  }

  // 多层菜单（手风琴展开）
  return (
    <div className="mb-1">
      <div
        title={collapsed ? item.title : undefined}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground",
          collapsed && "justify-center px-0"
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        {!collapsed && <span className="flex-1">{item.title}</span>}
      </div>
      {!collapsed && (
        <div className="ml-[18px] mt-1 border-l pl-3">
          {item.children!.map((child) => {
            const ChildIcon = child.icon;
            const active = pathname === child.href;
            return (
              <Link
                key={child.key}
                href={child.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] transition-colors",
                  active
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  isChildActive && !active && "text-foreground"
                )}
              >
                <ChildIcon className="h-4 w-4 shrink-0" />
                <span>{child.title}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
