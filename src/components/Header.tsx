import { Trophy } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/90">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Trophy className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <span>Fixtures</span>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
