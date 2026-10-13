import { JLPT_LEVELS } from "@/lib/content/schema";

export const XP_LESSON_FIRST = 30;
export const XP_LESSON_REPEAT = 5;

export interface DialogueLine {
  speaker: string;
  jp: string;
  en: string;
  reading?: string;
  audio_url?: string;
}

export interface QuickCheck {
  prompt: string;
  options: string[];
  answer: number;
  explanation?: string;
}

export interface LessonSummary {
  id: string;
  slug: string;
  jlpt_level: string;
  position: number;
  title: string;
  situation: string | null;
}

export interface LessonRow extends LessonSummary {
  item_slugs: string[];
  grammar_slug: string | null;
  dialogue: DialogueLine[];
  checks: QuickCheck[];
  notes: string | null;
}

export type LessonState = "done" | "next" | "open" | "locked";

const levelIndex = (level: string) => JLPT_LEVELS.indexOf(level as (typeof JLPT_LEVELS)[number]);

/** Course order: by JLPT level (preN5 first), then position within the level. */
export function compareLessons(a: LessonSummary, b: LessonSummary): number {
  return levelIndex(a.jlpt_level) - levelIndex(b.jlpt_level) || a.position - b.position;
}

/**
 * Each lesson unlocks once the one before it in course order is done. The
 * first unfinished unlocked lesson is "next"; finished ones stay open to redo.
 */
export function lessonStates<T extends LessonSummary>(
  lessons: T[],
  completed: Set<string>,
): (T & { state: LessonState })[] {
  const ordered = [...lessons].sort(compareLessons);
  let previousDone = true;
  let nextGiven = false;
  return ordered.map((lesson) => {
    const done = completed.has(lesson.id);
    let state: LessonState;
    if (done) state = "done";
    else if (!previousDone) state = "locked";
    else if (!nextGiven) {
      state = "next";
      nextGiven = true;
    } else state = "open";
    previousDone = done;
    return { ...lesson, state };
  });
}

/** Score the learner's picks against the lesson's checks. Missing or out-of-range picks count as wrong. */
export function scoreChecks(checks: QuickCheck[], picks: unknown): { correct: number; total: number } {
  const given = Array.isArray(picks) ? picks : [];
  const correct = checks.filter((c, i) => given[i] === c.answer).length;
  return { correct, total: checks.length };
}

/** XP for finishing a lesson: the full award once, a small one for each redo. */
export function lessonXp(firstTime: boolean): number {
  return firstTime ? XP_LESSON_FIRST : XP_LESSON_REPEAT;
}
