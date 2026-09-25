import { Trophy } from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link href="/" className="tap-active flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Trophy className="h-[18px] w-[18px]" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">Fixtures</span>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
