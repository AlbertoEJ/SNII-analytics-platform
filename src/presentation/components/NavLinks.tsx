"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Item {
  href: string;
  label: string;
  icon: React.ReactNode;
  match: (path: string) => boolean;
}

export function NavLinks({
  items,
  onNavigate,
}: {
  items: Item[];
  onNavigate?: () => void;
}) {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {items.map((it) => {
        const active = it.match(path);
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              active
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-medium"
                : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            <span aria-hidden className="w-4 h-4 flex items-center justify-center">
              {it.icon}
            </span>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
