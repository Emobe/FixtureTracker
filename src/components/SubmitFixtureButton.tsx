import { asc, eq } from "drizzle-orm";
import { auth, signIn } from "@/auth";
import { db } from "@/db";
import { competitions, sports } from "@/db/schema";
import { SubmitFixtureModal } from "./SubmitFixtureModal";

export async function SubmitFixtureButton() {
  const session = await auth();

  const rows = await db
    .select({
      id: competitions.id,
      name: competitions.name,
      sportSlug: sports.slug,
      sportName: sports.name,
    })
    .from(competitions)
    .innerJoin(sports, eq(competitions.sportId, sports.id))
    .where(eq(competitions.isLocked, false))
    .orderBy(asc(sports.name), asc(competitions.name));

  async function signInWithGitHub() {
    "use server";
    await signIn("github");
  }

  return (
    <SubmitFixtureModal
      isSignedIn={!!session?.user}
      competitions={rows}
      signInAction={signInWithGitHub}
    />
  );
}
