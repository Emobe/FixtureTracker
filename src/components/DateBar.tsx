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
    <div className="scrollbar-none flex items-center gap-2 overflow-x-auto border-b border-border px-4 pt-1 pb-3">
      {quickPicks.map((pick) => {
        const isActive = selected === pick.value;
        return (
          <button
            key={pick.label}
            type="button"
            onClick={() => selectDate(pick.value)}
            className={`tap-active shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-zinc-500 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
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
        className="tap-active shrink-0 rounded-full border border-border bg-transparent px-3 py-1.5 text-sm text-zinc-500 dark:text-zinc-400"
        aria-label="Pick a date"
      />
    </div>
  );
}
