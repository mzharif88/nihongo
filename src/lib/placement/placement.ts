import { Rating, review, newCard, type UserItemCard } from "@/lib/srs/fsrs";
import { buildCard, type Rng, type StudyCard, type StudyItem } from "@/lib/study/cards";
import { COURSE_LEVELS, courseLevels, type CourseLevel } from "@/lib/course/engine";

// Placement test: a short meaning quiz per level, N5 upwards, stopping at
// the first level the learner doesn't pass. Words answered right, and the
// unstarted words of every level passed, can be marked as known: they go
// straight into review, spread over the coming weeks so SRS checks them
// gradually instead of all at once, and the course skips them.

export const QUESTIONS_PER_LEVEL = 12;
/** Right answers needed to pass a level (10 of 12). */
export const PASS_MARK = 10;

type PlacementItem = StudyItem & { data?: { freq?: number | null } | null };

export interface LevelQuiz {
  level: CourseLevel;
  cards: StudyCard[];
  /** Unstarted words at this level, all of which are marked known if it's passed. */
  unstarted: number;
}

/**
 * Up to `count` unstarted words spread evenly across the level's frequency
 * range, so the quiz samples the whole level, not just its commonest words.
 */
export function sampleLevel(words: PlacementItem[], started: ReadonlySet<string>, count = QUESTIONS_PER_LEVEL): PlacementItem[] {
  const pool = words
    .filter((w) => !started.has(w.id))
    .sort((a, b) => (a.data?.freq ?? Number.MAX_SAFE_INTEGER) - (b.data?.freq ?? Number.MAX_SAFE_INTEGER) || a.slug.localeCompare(b.slug));
  if (pool.length <= count) return pool;
  return Array.from({ length: count }, (_, i) => pool[Math.floor(((i + 0.5) * pool.length) / count)]);
}

/** One quiz per course level up to the target, skipping levels with nothing left to test. */
export function placementQuizzes(items: PlacementItem[], started: ReadonlySet<string>, target: string, rng: Rng = Math.random): LevelQuiz[] {
  return courseLevels(target)
    .map((level) => {
      const words = items.filter((i) => i.type === "word" && i.jlpt_level === level);
      return {
        level,
        cards: sampleLevel(words, started).map((w) => buildCard(w, "recognition", true, words, rng)),
        unstarted: words.filter((w) => !started.has(w.id)).length,
      };
    })
    .filter((q) => q.cards.length > 0);
}

export const passed = (correct: number, total: number) => total > 0 && correct >= Math.min(PASS_MARK, total - Math.floor(total / 6));

/** Levels passed in order, stopping at the first one failed. */
export function passedLevels(results: { level: string; correct: number; total: number }[]): CourseLevel[] {
  const out: CourseLevel[] = [];
  for (const r of results) {
    if (!passed(r.correct, r.total) || !COURSE_LEVELS.includes(r.level as CourseLevel)) break;
    out.push(r.level as CourseLevel);
  }
  return out;
}

/**
 * A card for a word the learner already knows: one "easy" review, then due
 * `days` from now (first check-in spread out by the caller).
 */
export function knownCard(now: Date, days: number): UserItemCard {
  const card = review(newCard(now), Rating.Easy, now);
  return { ...card, due: new Date(now.getTime() + days * 86_400_000).toISOString() };
}

/** Spread `n` first reviews evenly from `from` to `to` days out. */
export function spreadDays(n: number, from: number, to: number): number[] {
  if (n <= 0) return [];
  if (n === 1) return [from];
  return Array.from({ length: n }, (_, i) => from + ((to - from) * i) / (n - 1));
}
