"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CurrentUser, Menu } from "@sekiro/shared";
import { STORAGE_KEYS } from "@sekiro/shared";

type AuthState = {
  token: string | null;
  user: CurrentUser | null;
  permissions: string[];
  menus: Menu[];
  setAuth: (token: string, user: CurrentUser, permissions: string[], menus: Menu[]) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      permissions: [],
      menus: [],
      setAuth: (token, user, permissions, menus) => {
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEYS.TOKEN, token);
        }
        set({ token, user, permissions, menus });
      },
      clearAuth: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem(STORAGE_KEYS.TOKEN);
        }
        set({ token: null, user: null, permissions: [], menus: [] });
      },
      isAuthenticated: () => !!get().token,
    }),
    {
      name: "sekiro-auth",
      partialize: (state) => ({ token: state.token }),
    }
  )
);
