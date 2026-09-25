"use client";

import { CalendarDays, Home, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}

const ITEMS: NavItem[] = [
  { label: "Fixtures", href: "/", icon: Home },
  { label: "Teams", href: "/teams", icon: Users },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
];

/** Mobile-only bottom tab bar. Destinations beyond "/" aren't built yet (later phases), so they render disabled. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom)] dark:border-neutral-800 dark:bg-neutral-950/95 md:hidden">
      <div className="mx-auto flex h-16 max-w-3xl items-stretch justify-around">
        {ITEMS.map((item) => {
          const isBuilt = item.href === "/";
          const isActive = isBuilt && pathname === item.href;
          const Icon = item.icon;

          if (!isBuilt) {
            return (
              <span
                key={item.href}
                aria-disabled="true"
                title="Coming soon"
                className="flex flex-1 flex-col items-center justify-center gap-1 text-xs text-neutral-300 dark:text-neutral-700"
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </span>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 text-xs transition-colors ${
                isActive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-neutral-500 dark:text-neutral-400"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
