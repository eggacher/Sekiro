"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { Locale } from "./config";
import { defaultLocale, locales } from "./config";
import { zh } from "./dictionaries/zh";
import { en } from "./dictionaries/en";
import type { Dictionary, TranslationKey } from "./types";

const dictionaries: Record<Locale, Dictionary> = {
  "zh-CN": zh,
  "en-US": en,
};

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "sekiro:locale";

function resolveLocale(raw: string | null): Locale {
  if (raw && (locales as string[]).includes(raw)) return raw as Locale;
  return defaultLocale;
}

function getByPath(
  obj: Record<string, unknown>,
  path: string
): string | undefined {
  const value = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
  return typeof value === "string" ? value : undefined;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocaleState(resolveLocale(localStorage.getItem(STORAGE_KEY)));
    setMounted(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    localStorage.setItem(STORAGE_KEY, next);
    setLocaleState(next);
  }, []);

  const dict = dictionaries[locale];

  const t = useCallback(
    (key: TranslationKey, values?: Record<string, string | number>) => {
      const raw =
        dict[key] ??
        getByPath(dict, key as string) ??
        (key as string);
      if (!values) return raw;
      return Object.entries(values).reduce(
        (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, "g"), String(v)),
        raw as string
      );
    },
    [dict]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  );

  // 避免 hydration 不匹配：首次渲染使用默认语言，挂载后再切换
  if (!mounted) {
    return (
      <I18nContext.Provider
        value={{
          locale: defaultLocale,
          setLocale: () => {},
          t: (key) => (zh[key] ?? (key as string)) as string,
        }}
      >
        {children}
      </I18nContext.Provider>
    );
  }

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslation must be used within I18nProvider");
  return ctx;
}
