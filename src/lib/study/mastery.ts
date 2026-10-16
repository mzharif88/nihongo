import type { StudyCard } from "./cards";

// How much support a learner gets, from how much they know and how well
// they're doing. Beginners get fewer answer choices and smaller groups of
// new items; as they learn more and keep their accuracy up, both grow
// towards the exam's four choices and longer runs. A slump steps back down.

export type StageId = "beginner" | "developing" | "confident";

export interface Stage {
  id: StageId;
  label: string;
  /** Answer choices per card (the exam has 4). */
  options: number;
  /** New items introduced together before their quiz. */
  introBatch: number;
  /** What it means for the learner, in a sentence. */
  summary: string;
  /** What moves them up next, if anything. */
  next: string | null;
}

/** Recent review grades counted towards accuracy (1 = again … 4 = easy). */
export const RECENT = 60;
const MIN_GRADED = 10;

/** Share of recent reviews answered right, or null with too little history. */
export function recentAccuracy(grades: number[]): number | null {
  const g = grades.slice(0, RECENT);
  return g.length >= MIN_GRADED ? g.filter((x) => x >= 2).length / g.length : null;
}

/**
 * The learner's stage. Beginner until 100 items are learned with at least
 * 75% recent accuracy; confident from 500 learned with 90%. Falling below
 * the accuracy bar moves them back, so a hard patch gets more support.
 */
export function learnerStage(learned: number, grades: number[]): Stage {
  const accuracy = recentAccuracy(grades);
  const pct = accuracy === null ? null : Math.round(accuracy * 100);
  if (learned >= 500 && accuracy !== null && accuracy >= 0.9) {
    return { id: "confident", label: "Confident", options: 4, introBatch: 5, summary: "4 answer choices, as in the exam, and 5 new items at a time.", next: null };
  }
  if (learned >= 100 && (accuracy === null || accuracy >= 0.75)) {
    return {
      id: "developing",
      label: "Developing",
      options: 4,
      introBatch: 4,
      summary: "4 answer choices, as in the exam, and 4 new items at a time.",
      next: `Confident at 500 items learned with 90% of reviews right (now ${learned}${pct === null ? "" : `, ${pct}%`}).`,
    };
  }
  return {
    id: "beginner",
    label: "Beginner",
    options: 3,
    introBatch: 3,
    summary: "3 answer choices and 3 new items at a time, so each step is small.",
    next:
      learned >= 100 && pct !== null
        ? `Back to Developing at 75% of reviews right (now ${pct}%).`
        : `Developing at 100 items learned (now ${learned}).`,
  };
}

/** Trim a card to `n` options, keeping the answer and the first wrong ones. */
export function withOptionCount(card: StudyCard, n: number): StudyCard {
  if (!card.options || card.answerIndex === undefined || card.options.length <= n) return card;
  const answer = card.options[card.answerIndex];
  const keep = new Set([card.answerIndex, ...card.options.map((_, i) => i).filter((i) => i !== card.answerIndex).slice(0, n - 1)]);
  const options = card.options.filter((_, i) => keep.has(i));
  return { ...card, options, answerIndex: options.indexOf(answer) };
}
