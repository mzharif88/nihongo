import Link from "next/link";
import { requireUser } from "@/lib/auth";
import type { Pace } from "@/lib/study/pace";
import { loadStudySession } from "@/lib/study/session.server";
import { signOut } from "./login/actions";

export default async function HomePage() {
  const { supabase, profile } = await requireUser();
  const [session, { data: game }] = await Promise.all([
    loadStudySession(supabase, profile),
    supabase.from("gamification").select("xp, streak").eq("user_id", profile.id).maybeSingle(),
  ]);
  const toStudy = session.dueCount + session.newCount;
  const { pace } = session;

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
          {session.newLeftToday === 0 ? " (today's pace done)" : ""}
        </div>
      </Link>

      <PaceCard
        pace={pace}
        targetLevel={profile.target_level}
        examDate={profile.exam_date}
        started={session.started}
        contentLeft={session.unstartedAvailable}
      />

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

const INTENSITY_NOTE: Record<Pace["intensity"], string> = {
  "no-date": "Set an exam date to get a daily pace.",
  past: "Your exam date has passed. Set the next one.",
  steady: "Steady pace.",
  intense: "Intense pace: expect a few hundred reviews a day.",
  unrealistic: "This pace isn't sustainable. Consider a later sitting or a lower target level.",
};

function PaceCard({
  pace,
  targetLevel,
  examDate,
  started,
  contentLeft,
}: {
  pace: Pace;
  targetLevel: string;
  examDate: string | null;
  started: number;
  contentLeft: number;
}) {
  const percent = Math.min(100, Math.round((started / pace.targetItems) * 100));
  const warn = pace.intensity === "unrealistic" || pace.intensity === "past";
  return (
    <section className="mt-6 rounded-xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-medium">
          {targetLevel}
          {examDate ? ` · ${new Date(`${examDate}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}
        </h2>
        <Link href="/settings" className="text-sm text-muted underline">
          Settings
        </Link>
      </div>
      {pace.daysLeft !== null && pace.daysLeft > 0 && (
        <p className="mt-1 text-2xl font-bold">
          {pace.daysLeft} days · {pace.newPerDay} new/day
        </p>
      )}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
        <div className="h-full bg-accent" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1 text-xs text-muted">
        {started} of ~{pace.targetItems.toLocaleString()} items started ({percent}%)
      </p>
      <p className={`mt-2 text-sm ${warn ? "text-red-600 dark:text-red-400" : "text-muted"}`}>
        {INTENSITY_NOTE[pace.intensity]}
      </p>
      {contentLeft < pace.newPerDay * 7 && pace.remaining > contentLeft && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          Only {contentLeft} unstarted items are live. Import more content to keep this pace.
        </p>
      )}
    </section>
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
