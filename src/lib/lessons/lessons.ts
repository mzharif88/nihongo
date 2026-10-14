import { JLPT_LEVELS } from "@/lib/content/schema";
import { XP_CORRECT, XP_WRONG } from "@/lib/study/streak";

// Lessons run in order: by JLPT level, then position. The first is open;
// each one after unlocks when the one before it is finished.
//
// Situation lessons (slug "situation-<group>-…") sit outside that chain:
// everyday scenes, always open, grouped on their own page.

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

export const SITUATION_GROUPS = [
  { id: "transport", title: "Public transport", jp: "[電車|でんしゃ]・バス", blurb: "Buy tickets, read station signs and announcements, ask for directions." },
  { id: "restaurant", title: "Restaurants", jp: "レストラン", blurb: "Get a table, read the menu, order, and pay the bill." },
  { id: "shopping", title: "Shopping", jp: "[買|か]い[物|もの]", blurb: "Ask prices, try things on, compare, and pay." },
  { id: "konbini", title: "Convenience store", jp: "コンビニ", blurb: "Heat-up, bags, point cards, payment, and asking staff for help." },
  { id: "services", title: "Hotel, doctor and services", jp: "ホテル・[病院|びょういん]・[役所|やくしょ]", blurb: "Check in, see a doctor, post a parcel, the bank, and the city office." },
] as const;

export type SituationGroupId = (typeof SITUATION_GROUPS)[number]["id"];

export const isSituation = (slug: string) => slug.startsWith("situation-");

/** The group a situation lesson belongs to ("situation-transport-01-kippu" → "transport"), or null. */
export function situationGroup(slug: string): SituationGroupId | null {
  if (!isSituation(slug)) return null;
  const id = slug.split("-")[1];
  return SITUATION_GROUPS.some((g) => g.id === id) ? (id as SituationGroupId) : null;
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
 * Situation lessons are always open and never "next".
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
    else if (isSituation(l.slug)) state = "open";
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

/**
 * Where "Next" goes after finishing a lesson: the next unfinished situation
 * in the same group for a situation, else the next lesson in the chain.
 */
export function nextLessonSlug(list: LessonSummary[], finished: string): string | null {
  const group = situationGroup(finished);
  if (!group) return list.find((l) => l.state === "next")?.slug ?? null;
  const inGroup = list.filter((l) => situationGroup(l.slug) === group);
  const at = inGroup.findIndex((l) => l.slug === finished);
  return [...inGroup.slice(at + 1), ...inGroup.slice(0, at)].find((l) => l.state !== "done")?.slug ?? null;
}
