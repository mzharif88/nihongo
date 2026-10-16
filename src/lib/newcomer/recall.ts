// Newcomer active recall: when a phrase comes back, how sure the learner is
// of it, and the order a session asks phrases in. Self-graded (Correct /
// Wrong), so the schedule is simple and easy to reason about.

export type Priority = "priority" | "normal" | "less" | "paused";
export const PRIORITIES: { id: Priority; label: string; hint: string }[] = [
  { id: "priority", label: "Priority", hint: "In every playlist and recall session" },
  { id: "normal", label: "Normal", hint: "Comes back on its schedule" },
  { id: "less", label: "Less often", hint: "Comes back three times as rarely" },
  { id: "paused", label: "Pause", hint: "Kept, but skipped" },
];

export interface RecallState {
  right: number;
  wrong: number;
  streak: number;
  /** ISO time it is next due. */
  due: string;
}

/** A phrase the learner can recall: their own, or one from the starter library. */
export interface RecallPhrase extends RecallState {
  /** "mine:<uuid>" or "starter:<slug>". */
  key: string;
  meaning: string;
  meaningLang: "en" | "ms";
  jp: string;
  /** Ruby markup ([漢字|かな]). */
  reading: string;
  kana: string;
  priority: Priority;
}

/** Days until the next review after this many correct answers in a row. */
const INTERVAL_DAYS = [1, 2, 4, 7, 14, 30, 60];
/** A miss comes back in the same session, a few minutes later. */
const RETRY_MINUTES = 10;
const DAY = 86_400_000;

/** The state after one self-graded answer. */
export function grade(state: RecallState, correct: boolean, priority: Priority, now = new Date()): RecallState {
  if (!correct) return { right: state.right, wrong: state.wrong + 1, streak: 0, due: new Date(now.getTime() + RETRY_MINUTES * 60_000).toISOString() };
  const streak = state.streak + 1;
  const days = INTERVAL_DAYS[Math.min(streak, INTERVAL_DAYS.length) - 1] * (priority === "less" ? 3 : 1);
  return { right: state.right + 1, wrong: state.wrong, streak, due: new Date(now.getTime() + days * DAY).toISOString() };
}

/** Share of answers right, as a whole percentage; null before the first answer. */
export function mastery(right: number, wrong: number): number | null {
  return right + wrong === 0 ? null : Math.round((100 * right) / (right + wrong));
}

/** Overall mastery across phrases: the average of each answered phrase's score, so one well-drilled phrase doesn't dominate. */
export function overallMastery(phrases: Pick<RecallState, "right" | "wrong">[]): number | null {
  const scores = phrases.map((p) => mastery(p.right, p.wrong)).filter((s): s is number => s !== null);
  return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
}

export const SESSION_SIZE = 20;

/**
 * A recall session: priority phrases first, then those due (most overdue
 * first), then never-answered ones, paused ones never. Up to `limit`.
 */
export function recallQueue<T extends RecallPhrase>(phrases: T[], now = new Date(), limit = SESSION_SIZE): T[] {
  const live = phrases.filter((p) => p.priority !== "paused");
  const due = (p: T) => new Date(p.due).getTime() <= now.getTime();
  const fresh = (p: T) => p.right + p.wrong === 0;
  const byDue = (a: T, b: T) => new Date(a.due).getTime() - new Date(b.due).getTime();
  const priority = live.filter((p) => p.priority === "priority").sort(byDue);
  const rest = live.filter((p) => p.priority !== "priority");
  const ordered = [...priority, ...rest.filter((p) => due(p) && !fresh(p)).sort(byDue), ...rest.filter((p) => due(p) && fresh(p))];
  return [...new Map(ordered.map((p) => [p.key, p])).values()].slice(0, limit);
}

/** How many phrases are waiting now (paused ones aside). */
export const dueCount = (phrases: RecallPhrase[], now = new Date()) =>
  phrases.filter((p) => p.priority !== "paused" && (p.priority === "priority" || new Date(p.due).getTime() <= now.getTime())).length;

/** Night Recall opens at 21:30 local time and stays open until 4am. */
export function nightRecallOpen(now: Date, timeZone: string): boolean {
  const [h, m] = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hour12: false })
    .format(now)
    .split(":")
    .map(Number);
  const minutes = (h % 24) * 60 + m;
  return minutes >= 21 * 60 + 30 || minutes < 4 * 60;
}

/** The start of tonight's Night Recall window (21:30 local), as a Date. */
export function nightRecallStart(now: Date, timeZone: string): Date {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  // Before 4am the window started yesterday evening.
  const back = Number(parts.hour) % 24 < 4 ? 1 : 0;
  const localMidnightUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) - back);
  // Offset of the zone at that moment, from comparing its wall clock with UTC.
  const probe = new Date(localMidnightUtc + 21.5 * 3_600_000);
  const wall = new Date(probe.toLocaleString("en-US", { timeZone }));
  const utc = new Date(probe.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(probe.getTime() - (wall.getTime() - utc.getTime()));
}
