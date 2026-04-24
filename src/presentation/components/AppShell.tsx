"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Locale } from "@/presentation/i18n/messages";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { CommandPalette } from "./CommandPalette";
import { ThemeToggle } from "./ThemeToggle";
import { MapIcon, UsersIcon, ChartIcon, SearchIcon } from "./icons";

interface Strings {
  appName: string;
  tagline: string;
  nav: {
    map: string;
    researchers: string;
    stats: string;
    searchPlaceholder: string;
    search: string;
    commandPlaceholder: string;
    commandEmpty: string;
    commandNoResults: string;
    commandHint: string;
    commandViewAllTemplate: string;
    theme: string;
  };
  footer: string;
}

export function AppShell({
  locale,
  strings,
  children,
}: {
  locale: Locale;
  strings: Strings;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    setIsMac(typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform));
  }, []);

  const items = [
    { href: "/", label: strings.nav.map, icon: MapIcon, match: (p: string) => p === "/" },
    {
      href: "/researchers",
      label: strings.nav.researchers,
      icon: UsersIcon,
      match: (p: string) => p.startsWith("/researchers"),
    },
    {
      href: "/stats",
      label: strings.nav.stats,
      icon: ChartIcon,
      match: (p: string) => p.startsWith("/stats"),
    },
  ];

  const openPalette = () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true }));
  };

  return (
    <TooltipProvider delay={150}>
      <CommandPalette
        locale={locale}
        strings={{
          placeholder: strings.nav.commandPlaceholder,
          empty: strings.nav.commandEmpty,
          noResults: strings.nav.commandNoResults,
          viewAllTemplate: strings.nav.commandViewAllTemplate,
        }}
      />
      <SidebarProvider>
        <Sidebar variant="floating" collapsible="icon">
          <SidebarHeader className="gap-3 pb-2">
            <Link
              href="/"
              className="flex items-center gap-2.5 px-2 py-1.5"
              aria-label={strings.appName}
            >
              <span className="grid place-items-center w-8 h-8 rounded-xl bg-foreground text-background text-[11px] font-bold tracking-tight shrink-0">
                SNII
              </span>
              <span className="flex flex-col leading-tight min-w-0 group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-semibold tracking-tight truncate">
                  {strings.appName}
                </span>
                <span className="text-[11px] text-muted-foreground truncate">
                  {strings.tagline}
                </span>
              </span>
            </Link>

            <button
              type="button"
              onClick={openPalette}
              aria-label={strings.nav.search}
              className="group/search relative mx-2 flex items-center gap-2 h-9 rounded-xl bg-sidebar-accent/40 hover:bg-sidebar-accent/60 px-3 text-left text-sm text-muted-foreground transition-colors group-data-[collapsible=icon]:hidden"
            >
              <SearchIcon className="w-3.5 h-3.5 text-muted-foreground stroke-current fill-none shrink-0" />
              <span className="flex-1 truncate">{strings.nav.searchPlaceholder}</span>
              <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-border/60 bg-background/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                {isMac ? "⌘" : "Ctrl"}K
              </kbd>
            </button>
          </SidebarHeader>

          <SidebarContent className="px-1">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((it) => {
                    const Icon = it.icon;
                    const active = it.match(path);
                    return (
                      <SidebarMenuItem key={it.href}>
                        <SidebarMenuButton
                          isActive={active}
                          tooltip={it.label}
                          render={
                            <Link href={it.href}>
                              <span
                                aria-hidden
                                className="w-4 h-4 flex items-center justify-center"
                              >
                                <Icon />
                              </span>
                              <span>{it.label}</span>
                            </Link>
                          }
                        />
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="gap-2 border-t border-sidebar-border">
            <div className="flex items-center justify-between gap-2 px-2 group-data-[collapsible=icon]:hidden">
              <span className="text-[10px] text-muted-foreground truncate flex-1">
                {strings.footer}
              </span>
              <ThemeToggle ariaLabel={strings.nav.theme} />
              <LocaleSwitcher current={locale} />
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          {/* Top bar with trigger, always present so users can collapse on desktop too */}
          <header className="sticky top-0 z-10 flex items-center gap-2 px-4 h-12 border-b bg-background/80 backdrop-blur">
            <SidebarTrigger className="-ml-1" />
            <Link href="/" className="font-semibold tracking-tight text-sm lg:hidden">
              {strings.appName}
            </Link>
          </header>
          <div className="flex-1 px-4 py-6 sm:px-6 min-w-0">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
