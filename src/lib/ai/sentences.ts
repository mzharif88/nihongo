import { z } from "zod";
import { stripMarkup } from "@/lib/furigana";

// AI-written example sentences: the prompt, the output schema, the checks
// every sentence must pass before it is kept, and what a run costs.
// Pure; the API call lives in engine.server.ts.

export const AI_MODELS = [
  { id: "claude-opus-5-5", label: "Claude Opus 5.5 · best quality", input: 4, output: 20, fallbacks: true },
  { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5 · about half the cost", input: 2, output: 10, fallbacks: true },
  { id: "claude-haiku-5-5", label: "Claude Haiku 5.5 · cheapest", input: 0.1, output: 0.5, fallbacks: false },
] as const;

export type AiModelId = (typeof AI_MODELS)[number]["id"];
export const DEFAULT_MODEL: AiModelId = "claude-opus-5-5";

export const isAiModel = (id: string): id is AiModelId => AI_MODELS.some((m) => m.id === id);

/** Estimated cost in USD from token usage at first-party list prices ($ per million tokens). */
export function costUsd(model: string, inputTokens: number, outputTokens: number): number {
  const m = AI_MODELS.find((x) => x.id === model) ?? AI_MODELS[0];
  return (inputTokens * m.input + outputTokens * m.output) / 1_000_000;
}

export interface WordRequest {
  slug: string;
  term: string;
  reading: string | null;
  meaning: string;
  level: string;
}

export const SentenceBatch = z.object({
  sentences: z.array(
    z.object({
      slug: z.string(),
      jp: z.string(),
      reading: z.string(),
      en: z.string(),
    }),
  ),
});
export type SentenceBatch = z.infer<typeof SentenceBatch>;

export const SYSTEM_PROMPT = `You write example sentences for a learner preparing for the JLPT. For each word you are given, write two short, natural sentences that a Japanese speaker would really say.

Rules for every sentence:
- It contains the word exactly as written (same kanji and kana; do not conjugate that occurrence).
- Its other vocabulary and grammar are at or below the word's JLPT level, so the learner can read it.
- 8 to 30 characters, one sentence, ending with 。 (or ？ for a question).
- "reading" is the same sentence with every run of kanji written as [漢字|かな] (for example [日本語|にほんご]を[勉強|べんきょう]します。). Everything outside the brackets is copied exactly, so removing the readings gives back "jp" character for character. Use the reading that fits the context.
- "en" is a natural English translation.
- "slug" is the slug of the word the sentence is for.

Prefer everyday situations and vary them; avoid names of real people and brands.`;

export function userPrompt(words: WordRequest[]): string {
  return `Write two example sentences for each of these words:\n${JSON.stringify(words, null, 1)}`;
}

const RUBY = /\[([^\]|]+)\|([^\]]+)\]/g;
const KANJI = /[㐀-鿿々]/;

/** Why a sentence can't be kept, or null if it passes. */
export function sentenceProblem(term: string, s: { jp: string; reading: string; en: string }): string | null {
  const jp = s.jp.trim();
  if (!jp.includes(term)) return "doesn't contain the word as written";
  if (jp.length < 4 || jp.length > 40) return "wrong length";
  if (!/[。？！?]$/.test(jp)) return "not a whole sentence";
  if (!s.en.trim()) return "no translation";
  if (stripMarkup(s.reading) !== jp) return "reading doesn't match the sentence";
  for (const m of s.reading.matchAll(RUBY)) {
    if (!KANJI.test(m[1])) return "reading marks up kana";
    if (!/^[ぁ-ゖー]+$/.test(m[2])) return "reading isn't hiragana";
  }
  const outside = s.reading.replace(RUBY, "");
  if (KANJI.test(outside)) return "kanji without a reading";
  return null;
}

/** Keep the sentences that pass, at most two per word, and count the rest. */
export function acceptSentences(
  words: WordRequest[],
  batch: SentenceBatch,
): { kept: { slug: string; jp: string; reading: string; en: string }[]; discarded: number } {
  const bySlug = new Map(words.map((w) => [w.slug, w]));
  const perWord = new Map<string, number>();
  const kept: { slug: string; jp: string; reading: string; en: string }[] = [];
  let discarded = 0;
  for (const s of batch.sentences) {
    const word = bySlug.get(s.slug);
    const count = perWord.get(s.slug) ?? 0;
    if (!word || count >= 2 || sentenceProblem(word.term, s) || kept.some((k) => k.jp === s.jp.trim())) {
      discarded++;
      continue;
    }
    perWord.set(s.slug, count + 1);
    kept.push({ slug: s.slug, jp: s.jp.trim(), reading: s.reading.trim(), en: s.en.trim() });
  }
  return { kept, discarded };
}
