export const DEFAULT_TIMEZONE = "Asia/Kuala_Lumpur";
export const XP_CORRECT = 10;
export const XP_WRONG = 2;

/** The calendar date (YYYY-MM-DD) at `now` in the learner's timezone. */
export function localDate(now: Date, timeZone: string = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Whole days from one YYYY-MM-DD date to another. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export interface StreakState {
  streak: number;
  longest_streak: number;
  freezes: number;
  last_study_date: string | null;
}

/**
 * Update the streak for a study session on `today`. Studying again the same
 * day changes nothing; the next day extends it; missing exactly one day
 * spends a freeze if one is available; anything longer restarts at 1.
 */
export function advanceStreak(state: StreakState, today: string): StreakState {
  const last = state.last_study_date;
  if (last === today) return state;

  let streak = 1;
  let freezes = state.freezes;
  if (last) {
    const gap = daysBetween(last, today);
    if (gap === 1) streak = state.streak + 1;
    else if (gap === 2 && freezes > 0) {
      streak = state.streak + 1;
      freezes -= 1;
    }
  }
  return { streak, freezes, longest_streak: Math.max(state.longest_streak, streak), last_study_date: today };
}

/** The instant local midnight began on `now`'s date in the learner's timezone. */
export function startOfLocalDay(now: Date, timeZone: string = DEFAULT_TIMEZONE): Date {
  const guess = Date.parse(`${localDate(now, timeZone)}T00:00:00Z`);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(new Date(guess))
      .map((p) => [p.type, p.value]),
  );
  const wall = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return new Date(guess - (wall - guess));
}
