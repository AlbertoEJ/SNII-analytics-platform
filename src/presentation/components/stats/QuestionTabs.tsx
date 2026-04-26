"use client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useEffect, useState, type ReactNode } from "react";

interface Props {
  strings: { count: string; place: string; field: string };
  count: ReactNode;
  place: ReactNode;
  field: ReactNode;
}

type TabValue = "count" | "place" | "field";
const TAB_VALUES: readonly TabValue[] = ["count", "place", "field"] as const;

/**
 * Hash format:
 *   #count                       → activate "count" tab
 *   #place/state-<DB-NAME>       → activate "place" tab and scroll to that row
 *   #field/inst-<NAME>           → activate "field" tab and scroll to institution row
 *   #field/area-<NAME>           → activate "field" tab and scroll to area row
 */
function parseHash(hash: string): { tab: TabValue | null; targetId: string | null } {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw) return { tab: null, targetId: null };
  const [tabPart, ...rest] = raw.split("/");
  const tab = (TAB_VALUES as readonly string[]).includes(tabPart) ? (tabPart as TabValue) : null;
  const targetId = rest.length > 0 ? decodeURIComponent(rest.join("/")) : null;
  return { tab, targetId };
}

export function QuestionTabs({ strings, count, place, field }: Props) {
  const [tab, setTab] = useState<TabValue>("count");
  const [pendingScroll, setPendingScroll] = useState<string | null>(null);

  // Sync from hash on mount and on hashchange (back/forward, anchor-link clicks).
  useEffect(() => {
    const apply = () => {
      const { tab: hashTab, targetId } = parseHash(window.location.hash);
      if (hashTab) setTab(hashTab);
      if (targetId) setPendingScroll(targetId);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  // After the active tab renders, scroll the target into view.
  useEffect(() => {
    if (!pendingScroll) return;
    // requestAnimationFrame ensures the new tab panel is in the DOM before we look for the id.
    const handle = requestAnimationFrame(() => {
      const el = document.getElementById(pendingScroll);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // Brief highlight so the user sees what the link landed on.
        el.classList.add("ring-2", "ring-ring", "ring-offset-2", "rounded-md", "transition-shadow");
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-ring", "ring-offset-2", "rounded-md");
        }, 1600);
      }
      setPendingScroll(null);
    });
    return () => cancelAnimationFrame(handle);
  }, [pendingScroll, tab]);

  const handleTabChange = (value: string) => {
    if (!(TAB_VALUES as readonly string[]).includes(value)) return;
    setTab(value as TabValue);
    // Reflect the bare tab in the URL so refresh/back keeps the user on the same view.
    if (typeof window !== "undefined") {
      history.replaceState(null, "", `#${value}`);
    }
  };

  return (
    <Tabs value={tab} onValueChange={handleTabChange}>
      <TabsList className="h-10 gap-1">
        <TabsTrigger value="count" className="text-base px-4">{strings.count}</TabsTrigger>
        <TabsTrigger value="place" className="text-base px-4">{strings.place}</TabsTrigger>
        <TabsTrigger value="field" className="text-base px-4">{strings.field}</TabsTrigger>
      </TabsList>
      <TabsContent value="count" className="mt-4">{count}</TabsContent>
      <TabsContent value="place" className="mt-4">{place}</TabsContent>
      <TabsContent value="field" className="mt-4">{field}</TabsContent>
    </Tabs>
  );
}
