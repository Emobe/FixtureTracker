import { LogIn } from "lucide-react";
import { auth, signIn, signOut } from "@/auth";

export async function AuthButton() {
  const session = await auth();

  if (session?.user) {
    const label = session.user.name ?? session.user.email ?? "Account";
    return (
      <form
        action={async () => {
          "use server";
          await signOut();
        }}
      >
        <button
          type="submit"
          title={`Signed in as ${label} — click to sign out`}
          className="tap-active flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {session.user.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- OAuth provider avatar, unpredictable domain.
            <img src={session.user.image} alt="" className="h-7 w-7 rounded-full" />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
              {label.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="hidden max-w-[8rem] truncate sm:inline">{label}</span>
        </button>
      </form>
    );
  }

  return (
    <form
      action={async () => {
        "use server";
        await signIn("github");
      }}
    >
      <button
        type="submit"
        className="tap-active flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
      >
        <LogIn className="h-4 w-4" />
        Sign in
      </button>
    </form>
  );
}
