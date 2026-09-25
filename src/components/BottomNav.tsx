"use client";

import { CalendarDays, Home, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
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
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
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
                className="flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium text-zinc-300 dark:text-zinc-700"
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
              className={`tap-active flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                isActive ? "text-accent" : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
