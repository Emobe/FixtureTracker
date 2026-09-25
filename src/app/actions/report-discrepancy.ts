"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/db";
import { competitions, fixtureProposals, fixtures } from "@/db/schema";
import {
  reportDiscrepancySchema,
  type ReportDiscrepancyState,
} from "@/lib/validation/report-discrepancy";

export async function reportDiscrepancyAction(
  _prevState: ReportDiscrepancyState,
  formData: FormData,
): Promise<ReportDiscrepancyState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: "error", message: "Sign in to report a discrepancy." };
  }

  const parsed = reportDiscrepancySchema.safeParse({
    fixtureId: formData.get("fixtureId"),
    reason: formData.get("reason"),
    proofUrl: formData.get("proofUrl"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: "error", message: "Check the highlighted fields.", fieldErrors };
  }
  const data = parsed.data;

  const fixture = await db.query.fixtures.findFirst({ where: eq(fixtures.id, data.fixtureId) });
  if (!fixture) return { status: "error", message: "Fixture not found." };

  const competition = await db.query.competitions.findFirst({
    where: eq(competitions.id, fixture.competitionId),
  });
  if (!competition?.isLocked) {
    return {
      status: "error",
      message: "Use the vote buttons for community fixtures instead.",
    };
  }

  await db.insert(fixtureProposals).values({
    fixtureId: fixture.id,
    reason: data.reason,
    proofUrl: data.proofUrl,
    status: "PENDING",
  });

  revalidatePath("/", "layout");
  return { status: "success", message: "Thanks — we've logged this for review." };
}
