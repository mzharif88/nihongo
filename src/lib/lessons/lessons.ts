import { JLPT_LEVELS } from "@/lib/content/schema";
import { XP_CORRECT, XP_WRONG } from "@/lib/study/streak";

// Lessons run in order: by JLPT level, then position. The first is open;
// each one after unlocks when the one before it is finished.

export interface LessonCheck {
  prompt: string;
  options: string[];
  answer: number;
  explanation?: string;
}

export interface DialogueLine {
  speaker: string;
  jp: string;
  en: string;
  reading?: string;
  audio_url?: string;
}

export interface LessonRow {
  id: string;
  slug: string;
  jlpt_level: string;
  position: number;
  title: string;
  situation: string | null;
  item_slugs: string[];
  grammar_slug: string | null;
  dialogue: DialogueLine[];
  checks: LessonCheck[];
  notes: string | null;
}

export interface LessonProgress {
  lesson_id: string;
  score: number;
  max_score: number;
  attempts: number;
  completed_at: string;
}

export type LessonState = "done" | "next" | "open" | "locked";

export interface LessonSummary {
  id: string;
  slug: string;
  jlpt_level: string;
  position: number;
  title: string;
  situation: string | null;
  itemCount: number;
  state: LessonState;
  progress: LessonProgress | null;
}

/** Bonus for finishing a lesson the first time, on top of the check XP. */
export const LESSON_BONUS_XP = 20;

const levelRank = (level: string) => JLPT_LEVELS.indexOf(level as (typeof JLPT_LEVELS)[number]);

export function compareLessons(a: Pick<LessonRow, "jlpt_level" | "position">, b: Pick<LessonRow, "jlpt_level" | "position">) {
  return levelRank(a.jlpt_level) - levelRank(b.jlpt_level) || a.position - b.position;
}

/**
 * Lessons in order with their state. "next" is the first unfinished lesson;
 * finished lessons stay open for replay; everything after "next" is locked.
 */
export function summarizeLessons(
  lessons: Pick<LessonRow, "id" | "slug" | "jlpt_level" | "position" | "title" | "situation" | "item_slugs">[],
  progress: LessonProgress[],
): LessonSummary[] {
  const byLesson = new Map(progress.map((p) => [p.lesson_id, p]));
  let nextFound = false;
  return [...lessons].sort(compareLessons).map((l) => {
    const p = byLesson.get(l.id) ?? null;
    let state: LessonState;
    if (p) state = "done";
    else if (!nextFound) {
      state = "next";
      nextFound = true;
    } else state = "locked";
    return {
      id: l.id,
      slug: l.slug,
      jlpt_level: l.jlpt_level,
      position: l.position,
      title: l.title,
      situation: l.situation,
      itemCount: l.item_slugs.length,
      state,
      progress: p,
    };
  });
}

export interface CheckResult {
  score: number;
  max: number;
  /** Per check: was the answer right? */
  correct: boolean[];
}

/** Score the learner's picks (one option index per check, or null if skipped). */
export function scoreChecks(checks: LessonCheck[], answers: (number | null)[]): CheckResult {
  const correct = checks.map((c, i) => answers[i] === c.answer);
  return { score: correct.filter(Boolean).length, max: checks.length, correct };
}

export function lessonXp(result: CheckResult, firstCompletion: boolean): number {
  const checkXp = result.correct.reduce((sum, ok) => sum + (ok ? XP_CORRECT : XP_WRONG), 0);
  return checkXp + (firstCompletion ? LESSON_BONUS_XP : 0);
}
