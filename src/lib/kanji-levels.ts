import { KANJI_BY_LEVEL } from "./kanji-levels.generated";

// Which kanji each JLPT level's exam prints. There are no official lists
// since 2010; these are the community lists the app's kanji come from. A
// level's exam uses its own kanji and every lower level's; anything else is
// printed in kana.

export const KANJI_LEVELS = ["N5", "N4", "N3", "N2"] as const;
export type KanjiLevel = (typeof KANJI_LEVELS)[number];

const RANK = new Map<string, number>();
KANJI_LEVELS.forEach((l, i) => {
  for (const k of KANJI_BY_LEVEL[l]) RANK.set(k, i);
});

const KANJI_CHAR = /[㐀-鿿豈-﫿々]/;
export const isKanjiChar = (c: string) => KANJI_CHAR.test(c);

/** 0 = N5 … 3 = N2; Infinity for kanji outside the N5–N2 lists. */
export const kanjiRank = (k: string) => RANK.get(k) ?? Infinity;

/** Rank of a JLPT level name; N1 and unknown levels allow every listed kanji (and nothing beyond). */
export function levelRank(level: string): number {
  if (level === "preN5") return -1;
  const i = KANJI_LEVELS.indexOf(level as KanjiLevel);
  return i < 0 ? KANJI_LEVELS.length - 1 : i;
}

/** Kanji in `text` that the exam at `level` wouldn't print (々 counts as the kanji before it). */
export function kanjiAbove(text: string, level: string): string[] {
  const max = levelRank(level);
  const out = new Set<string>();
  let prev = "";
  for (const c of text) {
    const k = c === "々" ? prev : c;
    if (isKanjiChar(c) && kanjiRank(k) > max) out.add(k);
    if (isKanjiChar(c)) prev = k;
  }
  return [...out];
}

/**
 * What a reader may see in kanji: every kanji up to `level` (the exam's own
 * kanji and lower levels') plus `known` (kanji the learner has started).
 * `null` means no limit.
 */
export interface KanjiAllowance {
  maxRank: number;
  known: string;
}

export function allowanceFor(level: string, known = ""): KanjiAllowance {
  return { maxRank: levelRank(level), known };
}

/** True when every kanji in `text` may be shown as kanji. */
export function kanjiAllowed(text: string, a: KanjiAllowance | null): boolean {
  if (!a) return true;
  let prev = "";
  for (const c of text) {
    if (!isKanjiChar(c)) continue;
    const k = c === "々" ? prev : c;
    prev = k;
    if (kanjiRank(k) > a.maxRank && !a.known.includes(k)) return false;
  }
  return true;
}

/** The higher of two levels (e.g. a word's level and the learner's stage). */
export const higherLevel = (a: string, b: string) => (levelRank(a) >= levelRank(b) ? a : b);
