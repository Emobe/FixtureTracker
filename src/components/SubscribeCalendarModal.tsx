"use client";

import { Apple, Calendar, Download, Mail, X } from "lucide-react";
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
        className="tap-active flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
      >
        <Calendar className="h-4 w-4" />
        Subscribe
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
          onClick={() => setIsOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Subscribe to ${name} calendar`}
            className="w-full max-w-sm rounded-t-2xl border-t border-border bg-surface p-5 sm:rounded-2xl sm:border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold tracking-tight">Subscribe to calendar</h2>
                <p className="mt-0.5 truncate text-sm text-zinc-500 dark:text-zinc-400">{name}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
                className="tap-active shrink-0 rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <a
                href={webcalUrl}
                className="tap-active flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <Apple className="h-5 w-5" />
                Apple Calendar
              </a>
              <a
                href={`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcalUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tap-active flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <Calendar className="h-5 w-5" />
                Google Calendar
              </a>
              <a
                href={webcalUrl}
                className="tap-active flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <Mail className="h-5 w-5" />
                Outlook
              </a>
              <a
                href={httpsUrl}
                download
                className="tap-active flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900"
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
