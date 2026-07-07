import { zh } from "./dictionaries/zh";

export type Dictionary = Record<string, string>;
export type TranslationKey = keyof typeof zh;

export type I18nContextValue = {
  locale: import("./config").Locale;
  setLocale: (locale: import("./config").Locale) => void;
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
};
