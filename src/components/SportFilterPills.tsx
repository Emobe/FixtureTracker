"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SPORT_FILTERS } from "@/lib/sports-config";

export function SportFilterPills() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSport = searchParams.get("sport");

  function select(slug: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) params.set("sport", slug);
    else params.delete("sport");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const pills = [{ slug: null, label: "All" }, ...SPORT_FILTERS];

  return (
    <div className="scrollbar-none flex gap-2 overflow-x-auto px-4 pt-3 pb-1">
      {pills.map((pill) => {
        const isActive = activeSport === pill.slug;
        return (
          <button
            key={pill.slug ?? "all"}
            type="button"
            onClick={() => select(pill.slug)}
            className={`tap-active shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-accent text-accent-foreground"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            {pill.label}
          </button>
        );
      })}
    </div>
  );
}
