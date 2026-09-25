import { NextResponse } from "next/server";
import { ADAPTERS, runAdapter } from "@/scrapers/run-adapters";

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization");

  if (!expected || provided !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = new Date().toISOString();
  const results = await Promise.all(ADAPTERS.map((adapter) => runAdapter(adapter, [], { capture: true })));
  const finishedAt = new Date().toISOString();

  const summary = results.map((r) => ({
    league: r.key,
    label: r.label,
    success: r.exitCode === 0,
    exitCode: r.exitCode,
    // Bound the response size; the full log is still useful for debugging a failure.
    log: r.output.slice(-4000),
  }));
  const allSucceeded = summary.every((s) => s.success);

  console.log(
    `[cron/scrape] ${startedAt} -> ${finishedAt}: ${summary.map((s) => `${s.league}=${s.success ? "ok" : "failed"}`).join(", ")}`,
  );

  return NextResponse.json(
    { startedAt, finishedAt, allSucceeded, results: summary },
    { status: allSucceeded ? 200 : 207 },
  );
}
