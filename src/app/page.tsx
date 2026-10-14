import Link from "next/link";
import { Ruby } from "@/components/ruby";
import { requireUser } from "@/lib/auth";
import { isSituation } from "@/lib/lessons/lessons";
import { loadLessonList } from "@/lib/lessons/lessons.server";
import type { Pace } from "@/lib/study/pace";
import { loadStudySession } from "@/lib/study/session.server";
import type { Topic } from "@/lib/study/topics";
import { signOut } from "./login/actions";

export default async function HomePage() {
  const { supabase, profile } = await requireUser();
  const [session, { data: game }, allLessons] = await Promise.all([
    loadStudySession(supabase, profile),
    supabase.from("gamification").select("xp, streak").eq("user_id", profile.id).maybeSingle(),
    loadLessonList(supabase, profile.id),
  ]);
  const situations = allLessons.filter((l) => isSituation(l.slug));
  const lessons = allLessons.filter((l) => !isSituation(l.slug));
  const situationsDone = situations.filter((l) => l.state === "done").length;
  const nextLesson = lessons.find((l) => l.state === "next") ?? null;
  const lessonsDone = lessons.filter((l) => l.state === "done").length;
  const { pace } = session;
  const lastTopic = session.topics.find((t) => t.id === profile.study_topic) ?? null;
  const studyHref = (t: Topic) => `/study?topic=${encodeURIComponent(t.id)}`;

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
        <Stat label="Due now" value={session.totalDue} />
        <Stat label="Streak" value={game?.streak ?? 0} />
        <Stat label="XP" value={game?.xp ?? 0} />
      </section>

      <Link href="/study" className="mt-6 block rounded-xl bg-accent p-5 text-center text-white">
        <div className="text-lg font-bold">Study everything</div>
        <div className="mt-1 text-sm opacity-90">
          {session.totalDue} reviews · {session.newCount} new in this batch · no daily limit
        </div>
      </Link>

      {lastTopic && (lastTopic.due > 0 || lastTopic.remaining > 0) && (
        <Link
          href={studyHref(lastTopic)}
          className="mt-3 flex items-center justify-between rounded-xl border-2 border-accent bg-card p-4"
        >
          <div>
            <div className="text-xs text-muted">Continue where you left off</div>
            <div className="text-lg font-bold">{lastTopic.label}</div>
          </div>
          <div className="text-right text-sm text-muted">
            {lastTopic.due > 0 && <div>{lastTopic.due} due</div>}
            <div>{lastTopic.remaining} new left</div>
          </div>
        </Link>
      )}

      {lessons.length > 0 && (
        <Link
          href={nextLesson ? `/lessons/${nextLesson.slug}` : "/lessons"}
          className="mt-3 block rounded-xl border border-border bg-card p-4 hover:border-accent"
        >
          <div className="flex items-baseline justify-between text-xs text-muted">
            <span>{nextLesson ? `Next lesson · ${nextLesson.jlpt_level} #${nextLesson.position}` : "Lessons"}</span>
            <span>
              {lessonsDone}/{lessons.length} done
            </span>
          </div>
          <div className="mt-1 text-lg font-bold">
            {nextLesson ? <Ruby text={nextLesson.title} /> : "All lessons done: replay any of them"}
          </div>
        </Link>
      )}
      <div className="mt-2 flex justify-between text-sm">
        <Link href="/builder" className="font-medium text-accent underline">
          Sentence builder →
        </Link>
        <Link href="/lessons" className="text-muted underline">
          All lessons
        </Link>
      </div>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <Link href="/mock" className="rounded-xl border border-border bg-card p-4 hover:border-accent">
          <div className="text-xs text-muted">JLPT Center</div>
          <div className="text-lg font-bold">Mock tests</div>
          <div className="mt-1 text-xs text-muted">Timed, real format, predicted score</div>
        </Link>
        <Link href="/reading" className="rounded-xl border border-border bg-card p-4 hover:border-accent">
          <div className="text-xs text-muted">Practice</div>
          <div className="text-lg font-bold">Reading</div>
          <div className="mt-1 text-xs text-muted">Graded passages with furigana</div>
        </Link>
        {situations.length > 0 && (
          <Link href="/situations" className="col-span-2 rounded-xl border border-border bg-card p-4 hover:border-accent">
            <div className="flex items-baseline justify-between text-xs text-muted">
              <span>Real life</span>
              <span>
                {situationsDone}/{situations.length} done
              </span>
            </div>
            <div className="text-lg font-bold">Everyday situations</div>
            <div className="mt-1 text-xs text-muted">Trains, restaurants, shopping and the convenience store: understand and respond</div>
          </Link>
        )}
      </section>

      <TopicGrid topics={session.topics} href={studyHref} />

      <PaceCard
        pace={pace}
        targetLevel={profile.target_level}
        examDate={profile.exam_date}
        started={session.started}
        contentLeft={session.unstartedInScope}
        introducedToday={session.introducedToday}
      />

      {profile.role === "admin" && (
        <Link
          href="/admin"
          className="mt-6 block rounded-xl border border-border bg-card p-4 font-medium hover:border-accent"
        >
          Admin console →
        </Link>
      )}

      <footer className="mt-10 text-center text-xs text-muted">
        <Link href="/attributions" className="underline">
          Data sources and attributions
        </Link>
      </footer>
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
  introducedToday,
}: {
  pace: Pace;
  targetLevel: string;
  examDate: string | null;
  started: number;
  contentLeft: number;
  introducedToday: number;
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
          {pace.daysLeft} days · aim for {pace.newPerDay} new/day
        </p>
      )}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
        <div className="h-full bg-accent" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1 text-xs text-muted">
        {started} of ~{pace.targetItems.toLocaleString()} items started ({percent}%) · {introducedToday} new today
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

const GROUP_ORDER: Topic["group"][] = ["Scripts", "Kanji", "Words by level", "Words by topic"];

/** Every topic as a tappable tile: tap to study it straight away. */
function TopicGrid({ topics, href }: { topics: Topic[]; href: (t: Topic) => string }) {
  return (
    <section className="mt-8 space-y-5">
      <h2 className="text-lg font-bold">Topics</h2>
      {GROUP_ORDER.map((group) => {
        const inGroup = topics.filter((t) => t.group === group);
        if (inGroup.length === 0) return null;
        return (
          <div key={group}>
            <h3 className="mb-2 text-sm text-muted">{group}</h3>
            <div className="grid grid-cols-2 gap-2">
              {inGroup.map((t) => {
                const startedPct = Math.round(((t.total - t.remaining) / t.total) * 100);
                const done = t.remaining === 0 && t.due === 0;
                return (
                  <Link
                    key={t.id}
                    href={href(t)}
                    className={`rounded-xl border border-border bg-card p-3 active:border-accent ${done ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium leading-tight">{t.label}</span>
                      {t.due > 0 && (
                        <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-white">{t.due}</span>
                      )}
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                      <div className="h-full bg-accent" style={{ width: `${startedPct}%` }} />
                    </div>
                    <div className="mt-1 text-xs text-muted">
                      {t.total - t.remaining}/{t.total}
                      {done ? " · done" : ""}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
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
