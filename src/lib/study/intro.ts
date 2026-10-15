import { shuffle, type StudyCard } from "./cards";

// New items are introduced a few at a time, then quizzed together, then the
// next few: learners see a small set side by side before being tested on it.
// New kana letters (hiragana and katakana) keep the one-at-a-time intro → quiz rhythm.

/** New items are introduced this many at a time, then quizzed together (new kana letters: one at a time). */
export const INTRO_BATCH = 4;

/**
 * The new cards to introduce next: the run of not-yet-introduced new cards at
 * the front of the queue, up to INTRO_BATCH. A kana letter goes alone.
 */
export function introGroup(queue: StudyCard[], introduced: ReadonlySet<string>): StudyCard[] {
  const fresh = (c: StudyCard | undefined) => !!c && c.isNew && !introduced.has(c.key);
  if (!fresh(queue[0])) return [];
  if (queue[0].introAlone) return [queue[0]];
  const group: StudyCard[] = [];
  for (const c of queue) {
    if (!fresh(c) || c.introAlone || group.length === INTRO_BATCH) break;
    group.push(c);
  }
  return group;
}

/** Shuffle the quizzes for a just-introduced group, so they don't come in the order they were shown. */
export function shuffleFront(queue: StudyCard[], n: number, rng: () => number = Math.random): StudyCard[] {
  return [...shuffle(queue.slice(0, n), rng), ...queue.slice(n)];
}
