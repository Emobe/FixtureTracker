"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

function toDateParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** The upcoming Saturday, or today if it's already Saturday/Sunday. */
function upcomingWeekend(from: Date): Date {
  const day = from.getDay(); // 0 = Sunday, 6 = Saturday
  if (day === 6 || day === 0) return from;
  return addDays(from, 6 - day);
}

export function DateBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const today = new Date();
  const selected = searchParams.get("date") ?? toDateParam(today);

  const quickPicks = [
    { label: "Yesterday", value: toDateParam(addDays(today, -1)) },
    { label: "Today", value: toDateParam(today) },
    { label: "Tomorrow", value: toDateParam(addDays(today, 1)) },
    { label: "This Weekend", value: toDateParam(upcomingWeekend(today)) },
  ];

  function selectDate(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="scrollbar-none flex items-center gap-2 overflow-x-auto border-t border-neutral-100 px-4 py-3 dark:border-neutral-900">
      {quickPicks.map((pick) => {
        const isActive = selected === pick.value;
        return (
          <button
            key={pick.label}
            type="button"
            onClick={() => selectDate(pick.value)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "border-emerald-600 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-emerald-950 dark:text-emerald-300"
                : "border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900"
            }`}
          >
            {pick.label}
          </button>
        );
      })}
      <input
        type="date"
        value={selected}
        onChange={(e) => e.target.value && selectDate(e.target.value)}
        className="shrink-0 rounded-full border border-neutral-200 bg-transparent px-3 py-1.5 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-300"
        aria-label="Pick a date"
      />
    </div>
  );
}
