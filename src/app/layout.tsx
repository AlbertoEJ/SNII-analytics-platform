import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getLocale } from "@/presentation/i18n/getLocale";
import { getMessages } from "@/presentation/i18n/messages";
import { LocaleSwitcher } from "@/presentation/components/LocaleSwitcher";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SNII Platform · Padrón de Investigadores",
  description: "Explora el padrón del Sistema Nacional de Investigadoras e Investigadores (SNII).",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const t = getMessages(locale);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/70 backdrop-blur sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="font-semibold text-lg tracking-tight">{t.appName}</span>
              <span className="hidden sm:inline text-xs text-zinc-500">{t.tagline}</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/researchers" className="hover:underline">{t.nav.researchers}</Link>
              <Link href="/stats" className="hover:underline">{t.nav.stats}</Link>
              <LocaleSwitcher current={locale} />
            </nav>
          </div>
        </header>
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-8">{children}</main>
        <footer className="border-t border-zinc-200 dark:border-zinc-800 py-6 text-center text-xs text-zinc-500">
          {t.appName} · Datos: SECIHTI · Padrón enero 2026
        </footer>
      </body>
    </html>
  );
}
