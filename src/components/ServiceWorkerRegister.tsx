"use client";

import { useEffect } from "react";

/** Registers public/sw.js for offline caching of recently viewed fixtures — see CLAUDE.md. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Offline support is a progressive enhancement; ignore registration failures.
      });
    }
  }, []);

  return null;
}
