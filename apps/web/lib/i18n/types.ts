import { zh } from "./dictionaries/zh";

export type TranslationKey = keyof typeof zh;
export type Dictionary = Record<TranslationKey, string>;

export type Locale = "zh-CN" | "en-US";
