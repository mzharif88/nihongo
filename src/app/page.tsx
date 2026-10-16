import Link from "next/link";
import { KanjiScope } from "@/components/kanji-scope";
import { Ruby } from "@/components/ruby";
import { requireUser } from "@/lib/auth";
import { isSituation } from "@/lib/lessons/lessons";
import { loadLessonList } from "@/lib/lessons/lessons.server";
import type { Pace } from "@/lib/study/pace";
import { dailyPlan, type DailyPlan, type PracticeKind } from "@/lib/study/plan";
import { loadTodayDone } from "@/lib/study/plan.server";
import { localDate } from "@/lib/study/streak";
import { loadStudySession } from "@/lib/study/session.server";
import type { Topic } from "@/lib/study/topics";
import { signOut } from "./login/actions";

export default async function HomePage() {
  const { supabase, profile } = await requireUser();
  const [session, { data: game }, allLessons, { count: listeningSets }] = await Promise.all([
    loadStudySession(supabase, profile),
    supabase.from("gamification").select("xp, streak").eq("user_id", profile.id).maybeSingle(),
    loadLessonList(supabase, profile.id),
    supabase.from("texts").select("id", { count: "exact", head: true }).eq("kind", "listening").eq("status", "live"),
  ]);
  const situations = allLessons.filter((l) => isSituation(l.slug));
  const lessons = allLessons.filter((l) => !isSituation(l.slug));
  const situationsDone = situations.filter((l) => l.state === "done").length;
  const nextLesson = lessons.find((l) => l.state === "next") ?? null;
  const lessonsDone = lessons.filter((l) => l.state === "done").length;
  const { pace } = session;
  const lastTopic = session.topics.find((t) => t.id === profile.study_topic) ?? null;
  const studyHref = (t: Topic) => `/study?topic=${encodeURIComponent(t.id)}`;

  const done = await loadTodayDone(supabase, profile, allLessons);
  const available = new Set<PracticeKind>(["reading", "builder", "mock", ...(situations.length ? (["situation"] as const) : []), ...(listeningSets ? (["listening"] as const) : [])]);
  const plan = dailyPlan({
    pace,
    totalDue: session.totalDue,
    introducedToday: session.introducedToday,
    done,
    weekday: new Date(`${localDate(new Date(), profile.timezone)}T00:00:00Z`).getUTCDay(),
    nextLessonHref: nextLesson ? `/lessons/${nextLesson.slug}` : null,
    available,
  });

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

      <TodayPlan plan={plan} targetLevel={profile.target_level} examDate={profile.exam_date} />

      <section className="mt-6 grid grid-cols-3 gap-3 text-center">
        <Stat label="Due now" value={session.totalDue} />
        <Stat label="Streak" value={game?.streak ?? 0} />
        <Stat label="XP" value={game?.xp ?? 0} />
      </section>

      <section className="mt-3 rounded-xl border border-border bg-card p-3 text-sm">
        <div className="flex items-baseline justify-between">
          <span className="font-medium">Learning style: {session.stage.label}</span>
          <span className="text-xs text-muted">adapts as you learn</span>
        </div>
        <p className="mt-1 text-muted">{session.stage.summary}</p>
        {session.stage.next && <p className="mt-1 text-xs text-muted">{session.stage.next}</p>}
      </section>

      <Link href="/study" className="mt-6 block rounded-xl bg-accent p-5 text-center text-white">
        <div className="text-lg font-bold">Study everything</div>
        <div className="mt-1 text-sm opacity-90">
          {session.totalDue} reviews · {session.newCount} new in this batch · no daily limit
        </div>
      </Link>

      <Link href="/course" className="mt-3 flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:border-accent">
        <div>
          <div className="text-xs text-muted">Adaptive course · up to {profile.target_level === "N1" ? "N2" : profile.target_level}</div>
          <div className="text-lg font-bold">Your next unit</div>
          <div className="text-xs text-muted">New kanji with the words that use them, sized to how you&apos;re doing</div>
        </div>
        <span className="text-2xl text-accent">→</span>
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
            {nextLesson ? <KanjiScope level={nextLesson.jlpt_level}><Ruby text={nextLesson.title} /></KanjiScope> : "All lessons done: replay any of them"}
          </div>
        </Link>
      )}
      <section className="mt-6">
        <h2 className="mb-2 text-lg font-bold">All sections</h2>
        <div className="grid grid-cols-2 gap-3">
          <Section href="/mock" label="JLPT mock tests" detail="Timed, real format, predicted score" highlight />
          <Section href="/lessons" label="Lessons" detail={`${lessonsDone}/${lessons.length} done`} />
          <Section href="/situations" label="Everyday situations" detail={`${situationsDone}/${situations.length} done`} />
          <Section href="/builder" label="Sentence builder" detail="Put words in order" />
          <Section href="/reading" label="Reading" detail="Graded passages" />
          <Section href="/listening" label="Listening" detail="JLPT listening parts" />
          <Section href="/kana" label="Kana chart" detail="Hiragana and katakana tables" />
          <Section href="/particles" label="Particles" detail="Which particle goes with which word" />
          <Section href="/kanji" label="Kanji side by side" detail="Look-alikes and families" />
          <Section href="/placement" label="Placement test" detail="Skip words you know" />
        </div>
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

const formatDate = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** The countdown and today's checklist; each task ticks itself off from what was done today. */
function TodayPlan({ plan, targetLevel, examDate }: { plan: DailyPlan; targetLevel: string; examDate: string | null }) {
  const all = plan.doneCount === plan.tasks.length;
  return (
    <section className="mt-6 rounded-xl border-2 border-accent bg-card p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-bold">Today&apos;s plan</h2>
        <span className="text-sm tabular-nums text-muted">
          {plan.doneCount}/{plan.tasks.length} done
        </span>
      </div>
      {plan.daysLeft !== null && examDate ? (
        <p className="mt-1 text-sm">
          <span className="text-2xl font-bold tabular-nums">{plan.daysLeft}</span> days to {targetLevel} · {formatDate(examDate)}
          {plan.phase === "review" && <span className="text-muted"> · final weeks: reviews and mocks</span>}
        </p>
      ) : (
        <p className="mt-1 text-sm text-muted">
          <Link href="/settings" className="underline">
            Set your exam date
          </Link>{" "}
          for a countdown.
        </p>
      )}
      <ul className="mt-3 space-y-2">
        {plan.tasks.map((t) => (
          <li key={t.id}>
            <Link href={t.href} className="flex items-center gap-3 rounded-lg border border-border p-3 hover:border-accent">
              <span
                aria-hidden
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${
                  t.done ? "border-accent bg-accent text-white" : "border-border"
                }`}
              >
                {t.done ? "✓" : ""}
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block font-medium ${t.done ? "text-muted line-through" : ""}`}>{t.label}</span>
                <span className="block text-xs text-muted">{t.detail}</span>
              </span>
              <span className="sr-only">{t.done ? "done" : "to do"}</span>
              {!t.done && <span className="text-accent">→</span>}
            </Link>
          </li>
        ))}
      </ul>
      {all && <p className="mt-3 text-sm font-medium text-accent">All done for today. Extra study still counts.</p>}
    </section>
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
          {examDate ? ` · ${formatDate(examDate)}` : ""}
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

const GROUP_ORDER: Topic["group"][] = ["Scripts", "Radicals", "Kanji", "Words by level", "Words by topic"];

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
                    // Finished topics open a quick retake drill instead of an empty study session.
                    href={done ? `/drill?topic=${encodeURIComponent(t.id)}` : href(t)}
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
                      {done ? " · done · retake" : ""}
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

function Section({ href, label, detail, highlight = false }: { href: string; label: string; detail: string; highlight?: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-xl bg-card p-4 hover:border-accent ${highlight ? "border-2 border-accent" : "border border-border"}`}
    >
      <div className="font-bold leading-tight">{label}</div>
      <div className="mt-1 text-xs text-muted">{detail}</div>
    </Link>
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
