"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { CurrentUser, Menu } from "@sekiro/shared";
import { STORAGE_KEYS } from "@sekiro/shared";
import { useAuthStore } from "@/lib/store/auth-store";
import { useTranslation } from "@/lib/i18n";
import { apiClient } from "@/lib/api/client";

import { toast } from "sonner";

const PUBLIC_PATHS = ["/login"];

type MeResponse = {
  user: CurrentUser;
  permissions: string[];
  menus: Menu[];
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const { t } = useTranslation();
  const isPublic = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    let cancelled = false;

    if (isPublic) {
      setReady(true);
      return;
    }

    const token =
      typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEYS.TOKEN) : null;

    if (!token) {
      useAuthStore.getState().clearAuth();
      router.replace("/login");
      return;
    }

    apiClient
      .get<MeResponse>("/auth/me")
      .then((data) => {
        if (cancelled) return;
        useAuthStore.getState().setAuth(token, data.user, data.permissions, data.menus);
        setReady(true);
      })
      .catch((err: any) => {
        if (cancelled) return;
        
        // Only clear auth and redirect to login if the error is specifically a 401 Unauthorized
        const isUnauthorized = 
          err?.code === 401 || 
          err?.message?.includes("401");

        if (isUnauthorized) {
          useAuthStore.getState().clearAuth();
          router.replace("/login");
        } else {
          toast.error(err.message || "获取用户信息失败");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pathname, router, isPublic]);

  if (!ready && !isPublic) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        {t("auth.loading")}
      </div>
    );
  }

  return <>{children}</>;
}
