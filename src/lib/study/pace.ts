import { daysBetween } from "./streak";

// Exam-date planner: how many new items a day it takes to reach the target
// level's vocabulary and kanji before the exam, leaving the last weeks for
// review and mock tests.

/** Cumulative community estimates from the plan's curriculum spine (JLPT has no official lists). */
export const LEVEL_TARGETS: Record<string, { kanji: number; vocab: number }> = {
  preN5: { kanji: 0, vocab: 100 },
  N5: { kanji: 100, vocab: 800 },
  N4: { kanji: 300, vocab: 1500 },
  N3: { kanji: 650, vocab: 3750 },
  N2: { kanji: 1000, vocab: 6000 },
  N1: { kanji: 2000, vocab: 10000 },
};

/** Hiragana and katakana, including voiced and combination sounds. */
const KANA_ITEMS = 210;
/** Stop adding new items this long before the exam, so the end is review and mocks. */
export const REVIEW_BUFFER_DAYS = 56;
/** Pace when no exam date is set. */
export const DEFAULT_NEW_PER_DAY = 20;

export type Intensity = "no-date" | "past" | "steady" | "intense" | "unrealistic";

export interface Pace {
  newPerDay: number;
  targetItems: number;
  remaining: number;
  daysLeft: number | null;
  intensity: Intensity;
}

export function targetItems(level: string): number {
  const t = LEVEL_TARGETS[level] ?? LEVEL_TARGETS.N5;
  return KANA_ITEMS + t.kanji + t.vocab;
}

export function studyPace(opts: { targetLevel: string; examDate: string | null; today: string; started: number }): Pace {
  const target = targetItems(opts.targetLevel);
  const remaining = Math.max(0, target - opts.started);
  if (!opts.examDate) {
    return { newPerDay: DEFAULT_NEW_PER_DAY, targetItems: target, remaining, daysLeft: null, intensity: "no-date" };
  }
  const daysLeft = daysBetween(opts.today, opts.examDate);
  if (daysLeft <= 0) {
    return { newPerDay: DEFAULT_NEW_PER_DAY, targetItems: target, remaining, daysLeft, intensity: "past" };
  }
  const learningDays = Math.max(1, daysLeft - REVIEW_BUFFER_DAYS);
  const newPerDay = remaining === 0 ? 0 : Math.max(5, Math.ceil(remaining / learningDays));
  const intensity: Intensity = newPerDay <= 20 ? "steady" : newPerDay <= 40 ? "intense" : "unrealistic";
  return { newPerDay, targetItems: target, remaining, daysLeft, intensity };
}
