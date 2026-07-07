import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/components/providers/i18n-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Sekiro · 管理后台",
  description: "开箱即用的中后台脚手架原型",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const nonce = headers().get("x-nonce") || undefined;

  return (
    <html lang="zh-CN" suppressHydrationWarning nonce={nonce}>
      <body className="font-sans antialiased">
        <I18nProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange
          >
            <AuthProvider>
              {children}
            </AuthProvider>
            <Toaster position="top-center" richColors closeButton />
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
