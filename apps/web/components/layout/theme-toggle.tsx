"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Check, Monitor, Moon, Palette, Sun } from "lucide-react";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ThemeColor = "default" | "purple" | "green" | "orange" | "rose" | "zinc";

const themeColors: {
  id: ThemeColor;
  label: string;
  light: string;
  dark: string;
}[] = [
  {
    id: "default",
    label: "Default",
    light: "221.2 83.2% 53.3%",
    dark: "217.2 91.2% 59.8%",
  },
  {
    id: "purple",
    label: "Purple",
    light: "262.1 83.3% 57.8%",
    dark: "263.4 70% 50.4%",
  },
  {
    id: "green",
    label: "Green",
    light: "142.1 76.2% 36.3%",
    dark: "142.1 70.6% 45.3%",
  },
  {
    id: "orange",
    label: "Orange",
    light: "24.6 95% 53.1%",
    dark: "20.5 90.2% 48.2%",
  },
  {
    id: "rose",
    label: "Rose",
    light: "346.8 77.2% 49.8%",
    dark: "346.8 77.2% 49.8%",
  },
  {
    id: "zinc",
    label: "Zinc",
    light: "240 5.9% 10%",
    dark: "0 0% 90.2%",
  },
];

const COLOR_STORAGE_KEY = "sekiro:theme-color";

function applyThemeColor(colorId: ThemeColor, resolvedTheme: string | undefined) {
  const color = themeColors.find((c) => c.id === colorId) ?? themeColors[0];
  const isDark = resolvedTheme === "dark";
  const primaryHsl = isDark ? color.dark : color.light;
  document.documentElement.style.setProperty("--primary", primaryHsl);
  document.documentElement.style.setProperty("--ring", primaryHsl);
}

export function ThemeSettings() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [color, setColor] = useState<ThemeColor>("default");

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(COLOR_STORAGE_KEY) as ThemeColor | null;
    if (saved && themeColors.some((c) => c.id === saved)) {
      setColor(saved);
    }
  }, []);

  useEffect(() => {
    applyThemeColor(color, resolvedTheme);
  }, [color, resolvedTheme]);

  const handleColorChange = (next: ThemeColor) => {
    setColor(next);
    localStorage.setItem(COLOR_STORAGE_KEY, next);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title={t("theme.appearance")}>
          <Palette className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">{t("theme.appearance")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{t("theme.appearance")}</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          {t("theme.light")}
          {theme === "light" && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          {t("theme.dark")}
          {theme === "dark" && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="mr-2 h-4 w-4" />
          {t("theme.system")}
          {theme === "system" && <Check className="ml-auto h-4 w-4" />}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuLabel>{t("theme.color")}</DropdownMenuLabel>
        {themeColors.map((c) => (
          <DropdownMenuItem key={c.id} onClick={() => handleColorChange(c.id)}>
            <span
              className="mr-2 h-4 w-4 rounded-full border"
              style={{ background: `hsl(${c.light})` }}
            />
            {c.label}
            {color === c.id && <Check className="ml-auto h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
