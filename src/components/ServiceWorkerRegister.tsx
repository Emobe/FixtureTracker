"use client";

import { useEffect } from "react";

/** Registers public/sw.js for offline caching of recently viewed fixtures — see CLAUDE.md. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // Never register the SW under `next dev` — it intercepts HMR/dev-server
      // requests and causes spurious "you're offline" fallbacks. Actively
      // unregister and clear caches too, in case a previous production run
      // on this same origin (localhost:3000) left one installed.
      navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) reg.unregister();
      });
      if ("caches" in window) {
        caches.keys().then((names) => names.forEach((name) => caches.delete(name)));
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline support is a progressive enhancement; ignore registration failures.
    });
  }, []);

  return null;
}
