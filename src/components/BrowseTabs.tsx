"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const TABS = [
  { href: "/teams", label: "Teams" },
  { href: "/competitions", label: "Competitions" },
] as const;

/** Segmented control switching between the /teams and /competitions browse pages, preserving the sport filter. */
export function BrowseTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  return (
    <div className="flex gap-1 border-b border-border px-4 pt-3">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={query ? `${tab.href}?${query}` : tab.href}
            className={`tap-active -mb-px rounded-t-lg border-b-2 px-3 pb-2 text-sm font-medium transition-colors ${
              isActive
                ? "border-accent text-accent"
                : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
