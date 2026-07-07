"use client";

import { I18nProvider as CoreProvider } from "@/lib/i18n";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  return <CoreProvider>{children}</CoreProvider>;
}
