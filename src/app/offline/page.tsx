import { WifiOff } from "lucide-react";

export const metadata = { title: "Offline — Sports Fixtures" };

/**
 * Precached by the service worker (src/../public/sw.js) and served for any
 * navigation that fails while offline with no cached copy of that page —
 * see CLAUDE.md's PWA/offline notes.
 */
export default function OfflinePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-20 text-center">
      <WifiOff className="h-8 w-8 text-zinc-400 dark:text-zinc-600" />
      <p className="text-sm font-medium">You&apos;re offline</p>
      <p className="max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
        Fixtures you&apos;ve already viewed are still available. Reconnect to see anything new.
      </p>
    </div>
  );
}
