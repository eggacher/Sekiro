"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { CurrentUser, Menu } from "@sekiro/shared";
import { STORAGE_KEYS } from "@sekiro/shared";
import { useAuthStore } from "@/lib/store/auth-store";
import { useTranslation } from "@/lib/i18n";
import { apiClient } from "@/lib/api/client";

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
  const { setAuth, clearAuth } = useAuthStore();
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
      clearAuth();
      router.replace("/login");
      return;
    }

    apiClient
      .get<MeResponse>("/auth/me")
      .then((data) => {
        if (cancelled) return;
        setAuth(token, data.user, data.permissions, data.menus);
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        clearAuth();
        router.replace("/login");
      });

    return () => {
      cancelled = true;
    };
  }, [pathname, router, setAuth, clearAuth, isPublic]);

  if (!ready && !isPublic) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        {t("auth.loading")}
      </div>
    );
  }

  return <>{children}</>;
}
