import { Suspense } from "react";
import { DateBar } from "@/components/DateBar";
import { SportFilterPills } from "@/components/SportFilterPills";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <Suspense fallback={<div className="h-[52px]" />}>
        <SportFilterPills />
      </Suspense>
      <Suspense fallback={<div className="h-[52px]" />}>
        <DateBar />
      </Suspense>

      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-16 text-center text-neutral-400 dark:text-neutral-600">
        <p className="text-sm">Fixture cards land in the next sub-phase.</p>
      </div>
    </div>
  );
}
