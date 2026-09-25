import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { db } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [GitHub],
  session: { strategy: "database" },
  // Local dev runs on whatever port is free (see CLAUDE.md); Auth.js needs
  // to trust that host instead of requiring a fixed NEXTAUTH_URL.
  trustHost: true,
  callbacks: {
    // Database sessions don't expose the user id on `session.user` by
    // default; submission/voting need it to attribute rows to a user.
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
