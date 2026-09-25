"use client";

import { Plus, X } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { submitFixtureAction } from "@/app/actions/submit-fixture";
import { initialSubmitFixtureState } from "@/lib/validation/fixture-submission";

interface CompetitionOption {
  id: string;
  name: string;
  sportSlug: string;
  sportName: string;
}

export function SubmitFixtureModal({
  isSignedIn,
  competitions,
  signInAction,
}: {
  isSignedIn: boolean;
  competitions: CompetitionOption[];
  signInAction: () => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [sportSlug, setSportSlug] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState(
    submitFixtureAction,
    initialSubmitFixtureState,
  );

  const sportOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const c of competitions) seen.set(c.sportSlug, c.sportName);
    return Array.from(seen, ([slug, name]) => ({ slug, name }));
  }, [competitions]);

  const visibleCompetitions = sportSlug
    ? competitions.filter((c) => c.sportSlug === sportSlug)
    : competitions;

  function close() {
    setIsOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Submit a grassroots fixture"
        className="tap-active fixed right-4 bottom-24 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg md:bottom-8"
      >
        <Plus className="h-6 w-6" />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Submit a grassroots fixture"
            className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-5 sm:rounded-2xl sm:border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold tracking-tight">Submit a fixture</h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="tap-active shrink-0 rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!isSignedIn ? (
              <div className="flex flex-col items-start gap-3">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Sign in to submit a grassroots fixture for verification.
                </p>
                <form action={signInAction}>
                  <button
                    type="submit"
                    className="tap-active rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90"
                  >
                    Sign in
                  </button>
                </form>
              </div>
            ) : competitions.length === 0 ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                No community competitions are open for submissions yet.
              </p>
            ) : state.status === "success" ? (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-emerald-600 dark:text-emerald-400">{state.message}</p>
                <button
                  type="button"
                  onClick={close}
                  className="tap-active self-start rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  Done
                </button>
              </div>
            ) : (
              <form action={formAction} className="flex flex-col gap-3">
                {state.status === "error" && state.message && (
                  <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/15 dark:text-amber-400">
                    {state.message}
                  </p>
                )}

                <Field label="Sport">
                  <select
                    value={sportSlug ?? ""}
                    onChange={(e) => setSportSlug(e.target.value || null)}
                    className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
                  >
                    <option value="">All sports</option>
                    {sportOptions.map((s) => (
                      <option key={s.slug} value={s.slug}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Competition" error={state.fieldErrors?.competitionId}>
                  <select
                    name="competitionId"
                    required
                    defaultValue=""
                    className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
                  >
                    <option value="" disabled>
                      Choose a competition
                    </option>
                    {visibleCompetitions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Home team" error={state.fieldErrors?.homeTeamName}>
                    <input
                      name="homeTeamName"
                      required
                      maxLength={100}
                      className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="Away team" error={state.fieldErrors?.awayTeamName}>
                    <input
                      name="awayTeamName"
                      required
                      maxLength={100}
                      className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Date" error={state.fieldErrors?.date}>
                    <input
                      type="date"
                      name="date"
                      required
                      className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
                    />
                  </Field>
                  <Field label="Kickoff time" error={state.fieldErrors?.time}>
                    <input
                      type="time"
                      name="time"
                      required
                      className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
                    />
                  </Field>
                </div>

                <Field label="Venue" error={state.fieldErrors?.venueName}>
                  <input
                    name="venueName"
                    required
                    maxLength={150}
                    className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
                  />
                </Field>

                <Field
                  label="Proof URL"
                  hint="A club website or social media post announcing this fixture."
                  error={state.fieldErrors?.proofUrl}
                >
                  <input
                    type="url"
                    name="proofUrl"
                    required
                    placeholder="https://…"
                    className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
                  />
                </Field>

                <button
                  type="submit"
                  disabled={isPending}
                  className="tap-active mt-1 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground hover:opacity-90 disabled:opacity-60"
                >
                  {isPending ? "Submitting…" : "Submit fixture"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</span>
      {children}
      {hint && !error && <span className="text-xs text-zinc-400 dark:text-zinc-500">{hint}</span>}
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </label>
  );
}
