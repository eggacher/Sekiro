import { zh } from "./dictionaries/zh";
import type { Locale } from "./config";

export type TranslationKey = keyof typeof zh;
export type Dictionary = Record<TranslationKey, string>;

export type { Locale };
