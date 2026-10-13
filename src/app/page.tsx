import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { signOut } from "./login/actions";

export default async function HomePage() {
  const { supabase, profile } = await requireUser();
  const now = new Date().toISOString();
  const [{ count: due }, { count: live }, { data: game }] = await Promise.all([
    supabase.from("user_items").select("*", { count: "exact", head: true }).lte("due", now),
    supabase.from("items").select("*", { count: "exact", head: true }).eq("status", "live"),
    supabase.from("gamification").select("xp, streak").eq("user_id", profile.id).maybeSingle(),
  ]);

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          おかえり、{profile.display_name ?? "learner"}
        </h1>
        <form action={signOut}>
          <button className="text-sm text-muted underline">Sign out</button>
        </form>
      </header>

      <section className="mt-6 grid grid-cols-3 gap-3 text-center">
        <Stat label="Due today" value={due ?? 0} />
        <Stat label="Streak" value={game?.streak ?? 0} />
        <Stat label="XP" value={game?.xp ?? 0} />
      </section>

      <section className="mt-6 rounded-xl border border-border bg-card p-4">
        <h2 className="font-medium">Daily loop</h2>
        <p className="mt-1 text-sm text-muted">
          Reviews, lessons and the sentence builder arrive in Phase 1. {live ?? 0} items are live so far; target level{" "}
          {profile.target_level}, {profile.daily_minutes} min/day.
        </p>
      </section>

      {profile.role === "admin" && (
        <Link
          href="/admin"
          className="mt-6 block rounded-xl border border-border bg-card p-4 font-medium hover:border-accent"
        >
          Admin console →
        </Link>
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}
