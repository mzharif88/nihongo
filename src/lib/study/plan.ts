import { REVIEW_BUFFER_DAYS, type Pace } from "./pace";

// Today's plan: a short checklist that ticks itself off from what the
// learner actually did today, plus the countdown to the exam.

export type PracticeKind = "reading" | "builder" | "situation" | "listening" | "mock";

/** What was finished today (in the learner's timezone). */
export interface TodayDone {
  reviews: number;
  lessons: number;
  situations: number;
  reading: number;
  builder: number;
  listening: number;
  mock: number;
}

export interface PlanTask {
  id: string;
  label: string;
  detail: string;
  href: string;
  done: boolean;
}

export interface DailyPlan {
  /** Days to the exam, or null with no date (or once it has passed). */
  daysLeft: number | null;
  /** "learn" adds new words; "review" is the last weeks: reviews and mocks only. */
  phase: "learn" | "review";
  tasks: PlanTask[];
  doneCount: number;
}

/** One practice skill per weekday (0 = Sunday), so every skill comes round each week. */
const ROTATION: PracticeKind[] = ["reading", "reading", "builder", "listening", "situation", "builder", "mock"];

const PRACTICE: Record<PracticeKind, { label: string; href: string; detail: string }> = {
  reading: { label: "Read a passage", href: "/reading", detail: "One graded passage with questions" },
  builder: { label: "Build sentences", href: "/builder", detail: "One sentence pattern" },
  situation: { label: "Practise a situation", href: "/situations", detail: "One real-life conversation" },
  listening: { label: "Listening drill", href: "/listening", detail: "One set of listening questions" },
  mock: { label: "Take a mock test", href: "/mock", detail: "A full timed test" },
};

export function practiceFor(weekday: number, available: ReadonlySet<PracticeKind>): PracticeKind {
  for (let i = 0; i < ROTATION.length; i++) {
    const kind = ROTATION[(weekday + i) % ROTATION.length];
    if (available.has(kind)) return kind;
  }
  return "reading";
}

export function dailyPlan(opts: {
  pace: Pace;
  totalDue: number;
  introducedToday: number;
  done: TodayDone;
  weekday: number;
  nextLessonHref: string | null;
  available: ReadonlySet<PracticeKind>;
}): DailyPlan {
  const { pace, done } = opts;
  const daysLeft = pace.daysLeft !== null && pace.daysLeft > 0 ? pace.daysLeft : null;
  const phase = daysLeft !== null && daysLeft <= REVIEW_BUFFER_DAYS ? "review" : "learn";
  const tasks: PlanTask[] = [];

  tasks.push({
    id: "reviews",
    label: "Clear your reviews",
    detail: opts.totalDue > 0 ? `${opts.totalDue} due now` : done.reviews > 0 ? `${done.reviews} answered today` : "Nothing due",
    href: "/study",
    done: opts.totalDue === 0,
  });

  if (phase === "learn" && pace.newPerDay > 0) {
    const left = Math.max(0, pace.newPerDay - opts.introducedToday);
    tasks.push({
      id: "new",
      label: `Learn ${pace.newPerDay} new`,
      detail: left > 0 ? `${opts.introducedToday} so far · ${left} to go` : `${opts.introducedToday} today`,
      href: "/course/next",
      done: left === 0,
    });
  }

  if (phase === "learn" && opts.nextLessonHref) {
    tasks.push({
      id: "lesson",
      label: "One lesson",
      detail: done.lessons > 0 ? "Done today" : "Dialogue, grammar and quick checks",
      href: opts.nextLessonHref,
      done: done.lessons > 0,
    });
  }

  // In the review phase a mock every day; otherwise the weekday's skill.
  const kind = phase === "review" ? "mock" : practiceFor(opts.weekday, opts.available);
  const p = PRACTICE[kind];
  tasks.push({ id: `practice-${kind}`, label: p.label, detail: p.detail, href: p.href, done: practiceDone(kind, done) });

  return { daysLeft, phase, tasks, doneCount: tasks.filter((t) => t.done).length };
}

function practiceDone(kind: PracticeKind, done: TodayDone): boolean {
  return (kind === "situation" ? done.situations : done[kind]) > 0;
}
