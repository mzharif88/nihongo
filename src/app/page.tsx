import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { loadStudySession } from "@/lib/study/session.server";
import { signOut } from "./login/actions";

export default async function HomePage() {
  const { supabase, profile } = await requireUser();
  const [session, { count: learning }, { data: game }] = await Promise.all([
    loadStudySession(supabase, profile),
    supabase.from("user_items").select("*", { count: "exact", head: true }).eq("card_type", "recognition"),
    supabase.from("gamification").select("xp, streak").eq("user_id", profile.id).maybeSingle(),
  ]);
  const toStudy = session.dueCount + session.newCount;

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
        <Stat label="Due now" value={session.dueCount} />
        <Stat label="Streak" value={game?.streak ?? 0} />
        <Stat label="XP" value={game?.xp ?? 0} />
      </section>

      <Link
        href="/study"
        className={`mt-6 block rounded-xl p-5 text-center ${
          toStudy ? "bg-accent text-white" : "border border-border bg-card text-muted"
        }`}
      >
        <div className="text-lg font-bold">{toStudy ? "Study now" : "All caught up"}</div>
        <div className="mt-1 text-sm opacity-90">
          {session.dueCount} reviews · {session.newCount} new
          {session.newLeftToday === 0 ? " (today's new cards done)" : ""}
        </div>
      </Link>

      <Link
        href="/lessons"
        className="mt-3 block rounded-xl border border-border bg-card p-4 text-center font-medium hover:border-accent"
      >
        Lessons →
      </Link>

      <p className="mt-3 text-center text-sm text-muted">
        {learning ?? 0} items started · {profile.daily_minutes} min/day · target {profile.target_level}
      </p>

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
