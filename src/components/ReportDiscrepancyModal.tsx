"use client";

import { Flag, X } from "lucide-react";
import { useActionState, useState } from "react";
import { reportDiscrepancyAction } from "@/app/actions/report-discrepancy";
import { initialReportDiscrepancyState } from "@/lib/validation/report-discrepancy";

export function ReportDiscrepancyModal({
  fixtureId,
  canInteract,
}: {
  fixtureId: string;
  canInteract: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    reportDiscrepancyAction,
    initialReportDiscrepancyState,
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title={canInteract ? "Report a discrepancy" : "Sign in from the header to report a discrepancy"}
        className="tap-active flex items-center gap-1 text-zinc-400 hover:text-accent dark:text-zinc-500"
      >
        <Flag className="h-3.5 w-3.5" />
        Report
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
          onClick={() => setIsOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Report a fixture discrepancy"
            className="w-full max-w-sm rounded-t-2xl border-t border-border bg-surface p-5 sm:rounded-2xl sm:border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-tight">Report a discrepancy</h2>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close"
                className="tap-active shrink-0 rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!canInteract ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Sign in from the header to report a discrepancy.
              </p>
            ) : state.status === "success" ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-emerald-600 dark:text-emerald-400">{state.message}</p>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="tap-active self-start rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  Done
                </button>
              </div>
            ) : (
              <form action={formAction} className="flex flex-col gap-3">
                <input type="hidden" name="fixtureId" value={fixtureId} />
                {state.status === "error" && state.message && (
                  <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/15 dark:text-amber-400">
                    {state.message}
                  </p>
                )}

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    What&apos;s wrong?
                  </span>
                  <textarea
                    name="reason"
                    required
                    rows={3}
                    maxLength={500}
                    placeholder="e.g. kickoff time has changed to 3pm"
                    className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
                  />
                  {state.fieldErrors?.reason && (
                    <span className="text-xs text-red-600 dark:text-red-400">
                      {state.fieldErrors.reason}
                    </span>
                  )}
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Source URL
                  </span>
                  <input
                    type="url"
                    name="proofUrl"
                    required
                    placeholder="https://…"
                    className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
                  />
                  {state.fieldErrors?.proofUrl && (
                    <span className="text-xs text-red-600 dark:text-red-400">
                      {state.fieldErrors.proofUrl}
                    </span>
                  )}
                </label>

                <button
                  type="submit"
                  disabled={isPending}
                  className="tap-active mt-1 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-60"
                >
                  {isPending ? "Sending…" : "Send report"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
