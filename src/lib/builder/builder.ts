import { stripMarkup } from "@/lib/furigana";
import { shuffle, type Rng } from "@/lib/study/cards";
import { XP_CORRECT, XP_WRONG } from "@/lib/study/streak";

// Sentence builder: arrange tiles into the Japanese sentence for an English
// prompt. Tiles are ruby markup; answers compare their plain text, so two
// identical tiles (two に) are interchangeable.

export interface BuilderExercise {
  jp: string;
  en: string;
  reading?: string;
  tiles: string[];
  distractors: string[];
  also: string[];
}

export interface PatternRow {
  id: string;
  slug: string;
  jlpt_level: string;
  position: number | null;
  title: string;
  english: string | null;
  grammar_slug: string | null;
  notes: string | null;
  examples: BuilderExercise[];
}

export interface BuilderProgress {
  pattern_id: string;
  best_score: number;
  max_score: number;
  attempts: number;
}

export interface Tile {
  id: number;
  text: string;
}

/** Bonus for the first full run through a pattern. */
export const BUILDER_BONUS_XP = 10;

const plain = (s: string) => stripMarkup(s).replace(/[。？！?!、\s]/g, "");

/** Exercises that can be played: they have tiles. */
export function playable(examples: BuilderExercise[] | null | undefined): BuilderExercise[] {
  return (examples ?? []).filter((e) => Array.isArray(e.tiles) && e.tiles.length >= 2);
}

/** The sentence's tiles plus decoys, shuffled, each with a stable id. Never starts already solved. */
export function dealTiles(ex: BuilderExercise, rng: Rng = Math.random): Tile[] {
  const all = [...ex.tiles, ...(ex.distractors ?? [])].map((text, id) => ({ id, text }));
  for (let tries = 0; tries < 5; tries++) {
    const dealt = shuffle(all, rng);
    if (!isCorrect(ex, dealt.slice(0, ex.tiles.length).map((t) => t.text))) return dealt;
  }
  return [...all.slice(1), all[0]];
}

/** Is this arrangement of tile texts the sentence (or another accepted order)? */
export function isCorrect(ex: BuilderExercise, picked: string[]): boolean {
  const answer = picked.map(plain).join("");
  return [plain(ex.jp), ...(ex.also ?? []).map(plain)].includes(answer);
}

export function scoreBuilder(exercises: BuilderExercise[], answers: string[][]) {
  const correct = exercises.map((ex, i) => Array.isArray(answers[i]) && isCorrect(ex, answers[i].map(String)));
  return { score: correct.filter(Boolean).length, max: exercises.length, correct };
}

export function builderXp(correct: boolean[], firstRun: boolean): number {
  return correct.reduce((sum, ok) => sum + (ok ? XP_CORRECT : XP_WRONG), 0) + (firstRun ? BUILDER_BONUS_XP : 0);
}

export function comparePatterns(a: Pick<PatternRow, "position" | "slug">, b: Pick<PatternRow, "position" | "slug">) {
  return (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER) || a.slug.localeCompare(b.slug);
}

/** A small deterministic RNG, so the server render and the browser deal the same tiles. */
export function seededRng(seed: string): Rng {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}
