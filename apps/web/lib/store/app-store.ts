"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type TabItem = {
  title: string;
  href: string;
  closable?: boolean;
};

type AppState = {
  collapsed: boolean;
  toggleCollapsed: () => void;
  tabs: TabItem[];
  addTab: (tab: TabItem) => void;
  removeTab: (href: string) => void;
  removeOtherTabs: (href: string) => void;
  removeAllTabs: () => void;
};

const HOME_TAB: TabItem = { title: "工作台", href: "/", closable: false };

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      collapsed: false,
      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),

      tabs: [HOME_TAB],
      addTab: (tab) => {
        const tabs = get().tabs;
        if (tabs.find((t) => t.href === tab.href)) return;
        if (tab.href === "/") return; // 工作台固定
        set({ tabs: [...tabs, tab] });
      },
      removeTab: (href) => {
        if (href === "/") return;
        set({ tabs: get().tabs.filter((t) => t.href !== href) });
      },
      removeOtherTabs: (href) => {
        set({
          tabs: [HOME_TAB, ...get().tabs.filter((t) => t.href === href && t.href !== "/")],
        });
      },
      removeAllTabs: () => set({ tabs: [HOME_TAB] }),
    }),
    { name: "sekiro-layout" }
  )
);
