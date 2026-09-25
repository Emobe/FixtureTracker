"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  // Always start false (matching the server, which has no `document`) so
  // the first client render doesn't structurally differ from the SSR'd
  // markup — reading real DOM state via a lazy initializer instead caused a
  // genuine hydration mismatch (React error #418), not just a dev warning.
  // The mount effect below corrects it once, per React's documented pattern
  // for state that can only be known client-side.
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Syncing from an external system (the DOM class set by the
    // pre-hydration theme script) that's genuinely unknown during SSR —
    // the standard fix for the hydration mismatch noted above.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // localStorage unavailable (private browsing, etc.) — theme just won't persist.
    }
    setIsDark(next);
  }

  return (
    <button
      type="button"
      aria-label="Toggle dark mode"
      className="tap-active flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
      onClick={toggle}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
