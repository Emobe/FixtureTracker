"use client";

import { Apple, Calendar, Download, X } from "lucide-react";
import { useState } from "react";

export function SubscribeCalendarModal({
  kind,
  slug,
  name,
}: {
  kind: "team" | "competition";
  slug: string;
  name: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const path = `/api/calendar/${kind}/${slug}.ics`;
  const httpsUrl = typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
  const webcalUrl = httpsUrl.replace(/^https?:\/\//, "webcal://");

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
      >
        <Calendar className="h-4 w-4" />
        Subscribe
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => setIsOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Subscribe to ${name} calendar`}
            className="w-full max-w-sm rounded-t-2xl bg-white p-5 dark:bg-neutral-900 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Subscribe to {name}</h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
                className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <a
                href={webcalUrl}
                className="flex items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
              >
                <Apple className="h-5 w-5" />
                Apple Calendar
              </a>
              <a
                href={`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
              >
                <Calendar className="h-5 w-5" />
                Google Calendar
              </a>
              <a
                href={httpsUrl}
                download
                className="flex items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3 text-sm font-medium hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800"
              >
                <Download className="h-5 w-5" />
                Download .ics
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
