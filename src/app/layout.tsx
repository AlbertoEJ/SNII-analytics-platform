import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "@fontsource-variable/geist/index.css";
import "./globals.css";
import { getLocale } from "@/presentation/i18n/getLocale";
import { getMessages } from "@/presentation/i18n/messages";
import { AppShell } from "@/presentation/components/AppShell";
import { ThemeProvider } from "@/presentation/components/ThemeProvider";

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SNII Platform · Padrón de Investigadores",
  description:
    "Explora el padrón del Sistema Nacional de Investigadoras e Investigadores (SNII).",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const t = getMessages(locale);

  return (
    <html
      lang={locale}
      className={`${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground">
        <ThemeProvider>
          <AppShell
            locale={locale}
            strings={{
              appName: t.appName,
              tagline: t.tagline,
              nav: t.nav,
              footer: "SECIHTI · Padrón enero 2026",
            }}
          >
            {children}
          </AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
