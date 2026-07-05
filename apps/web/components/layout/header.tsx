"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronsRight,
  Search,
  Settings,
  User,
  LogOut,
  Palette,
} from "lucide-react";
import { findBreadcrumb } from "@/lib/menu";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/lib/store/auth-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "./theme-toggle";
import { Separator } from "@/components/ui/separator";
import { useAppStore } from "@/lib/store/app-store";

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const crumbs = findBreadcrumb(pathname);
  const { toggleCollapsed } = useAppStore();
  const { user, clearAuth } = useAuthStore();

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
      <button
        onClick={toggleCollapsed}
        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title="折叠/展开"
      >
        <ChevronsRight className="h-4 w-4 rotate-180" />
      </button>

      {/* 面包屑 */}
      <nav className="flex items-center gap-1 text-sm">
        {crumbs.length === 0 ? (
          <span className="text-muted-foreground">首页</span>
        ) : (
          crumbs.map((c, i) => (
            <span key={c.href} className="flex items-center gap-1">
              {i > 0 && <span className="text-muted-foreground/50">/</span>}
              {i === crumbs.length - 1 ? (
                <span className="font-medium text-foreground">{c.title}</span>
              ) : (
                <Link href={c.href} className="text-muted-foreground hover:text-foreground">
                  {c.title}
                </Link>
              )}
            </span>
          ))
        )}
      </nav>

      <div className="ml-auto flex items-center gap-1">
        {/* 搜索 */}
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="搜索…"
            className="h-9 w-44 rounded-md border border-input bg-background pl-8 pr-3 text-sm shadow-sm outline-none transition-all focus:w-56 focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <ThemeToggle />

        {/* 通知 */}
        <Button variant="ghost" size="icon" className="relative" title="通知">
          <Bell className="h-[1.2rem] w-[1.2rem]" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-6" />

        {/* 用户菜单 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-accent">
              <Avatar className="h-8 w-8">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary/10 text-primary">
                {user?.nickname?.charAt(0) || user?.username?.charAt(0) || "U"}
              </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium md:inline">
                {user?.nickname || user?.username || "用户"}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>我的账户</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <User className="h-4 w-4" />
              个人中心
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/tool/config")}>
              <Settings className="h-4 w-4" />
              系统配置
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Palette className="h-4 w-4" />
              外观设置
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={async () => {
                try {
                  await apiClient.post("/auth/logout", {});
                } catch {
                  // 即使接口失败也继续清掉本地态并跳转登录页
                } finally {
                  clearAuth();
                  router.replace("/login");
                }
              }}
            >
              <LogOut className="h-4 w-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
