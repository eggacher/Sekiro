"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { X, Home, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store/app-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { findBreadcrumb } from "@/lib/menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TabsNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { tabs, addTab, removeTab, removeOtherTabs, removeAllTabs } = useAppStore();
  const { menus } = useAuthStore();

  // 同步当前路径到 tabs
  const crumbs = findBreadcrumb(menus, pathname);
  const currentTitle = crumbs[crumbs.length - 1]?.title;
  if (currentTitle && !tabs.find((t) => t.href === pathname) && pathname !== "/") {
    addTab({ title: currentTitle, href: pathname });
  }

  const handleClick = (href: string) => router.push(href);
  const handleClose = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    e.stopPropagation();
    const idx = tabs.findIndex((t) => t.href === href);
    removeTab(href);
    if (pathname === href) {
      const next = tabs[idx - 1] ?? tabs[0];
      router.push(next.href);
    }
  };

  return (
    <div className="flex h-9 items-center gap-1 border-b bg-background px-2">
      <div className="scrollbar-thin flex flex-1 items-center gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const active = tab.href === pathname;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              onClick={() => handleClick(tab.href)}
              className={cn(
                "group flex h-7 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors",
                active
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {tab.href === "/" && <Home className="h-3 w-3" />}
              <span>{tab.title}</span>
              {tab.closable !== false && (
                <button
                  onClick={(e) => handleClose(e, tab.href)}
                  className="ml-0.5 hidden rounded-sm p-0.5 hover:bg-destructive/15 hover:text-destructive group-hover:block"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Link>
          );
        })}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground">
            <XCircle className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => removeOtherTabs(pathname)}>关闭其他</DropdownMenuItem>
          <DropdownMenuItem onClick={removeAllTabs}>关闭全部</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
