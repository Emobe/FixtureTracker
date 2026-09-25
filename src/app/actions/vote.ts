"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { castVoteForUser, type VoteActionResult } from "@/lib/votes";

export async function castVoteAction(
  fixtureId: string,
  direction: 1 | -1,
): Promise<VoteActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { status: "error", message: "Sign in to vote." };
  }

  const result = await castVoteForUser(fixtureId, session.user.id, direction);

  // Fixture cards render on the homepage as well as team/competition pages,
  // all under the root layout, so revalidate broadly rather than guessing paths.
  if (result.status === "ok") revalidatePath("/", "layout");
  return result;
}
