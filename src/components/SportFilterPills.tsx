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
    <div className="scrollbar-none flex gap-2 overflow-x-auto px-4 py-3">
      {pills.map((pill) => {
        const isActive = activeSport === pill.slug;
        return (
          <button
            key={pill.slug ?? "all"}
            type="button"
            onClick={() => select(pill.slug)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "bg-emerald-600 text-white dark:bg-emerald-500"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
            }`}
          >
            {pill.label}
          </button>
        );
      })}
    </div>
  );
}
