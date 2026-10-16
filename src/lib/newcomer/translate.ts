import { z } from "zod";
import { isMarkup, parseMarkup, stripMarkup } from "@/lib/furigana";

// Turning a learner's own sentence (English or Malay) into the polite
// Japanese they'd say, with furigana and an all-kana version. Pure: the
// prompt, the output schema and the checks. The API call is translate.server.ts.

export const NEWCOMER_MODEL = "claude-opus-5-5";
export const MAX_LINES = 20;

export const Translation = z.object({
  phrases: z.array(
    z.object({
      index: z.number(),
      lang: z.enum(["en", "ms"]),
      meaning: z.string(),
      jp: z.string(),
      reading: z.string(),
      words: z.array(z.string()),
    }),
  ),
});
export type Translation = z.infer<typeof Translation>;

export const SYSTEM_PROMPT = `You translate sentences from a learner's daily life into the Japanese they would actually say, so they can practise speaking it.

The learner is a Malaysian adult beginner. Each input line is in English or Malay (possibly with typos or mixed). A line may start with who they're talking to, or where or when, before a colon ("to my boss: can I leave early today?", "kat klinik: saya demam sejak semalam"). That part is context, not something to say: use it to choose the words, and don't translate it into "jp". For each line:
- "lang": "en" or "ms", the language it is written in.
- "meaning": the line tidied up in that same language (fix typos and spelling; keep its meaning and tone). Don't translate it. Keep any context as a short lead-in in brackets: "(To my boss) Can I leave early today?".
- "jp": what a Japanese person would naturally say in that situation, in polite form (です/ます; requests with ください or お願いします). Translate what they mean, not the words: "please make me coffee" is コーヒーをお願いします or コーヒーを入れてください, not コーヒーを作ってください. Kanji where a native would write them. One or two sentences, ending with 。 or ？.
- "reading": "jp" with every run of kanji written as [漢字|かな], for example [日本語|にほんご]を[勉強|べんきょう]しています。 Everything outside the brackets is copied exactly, so removing the readings gives back "jp" character for character. Use the reading that fits the context.
- "words": the dictionary form of each content word in "jp" (nouns, verbs, adjectives, adverbs; not particles, です or ます), written as a dictionary writes them: 食べました → 食べる, 行きたい → 行く, 好き → 好き, コーヒー → コーヒー. Leave out names and numbers.
- "index": the line's number as given.

If a line isn't a sentence someone would say (a single English word, say), still give the most useful polite phrase for it.`;

export const userPrompt = (lines: string[]) => `Translate each line:\n${lines.map((l, i) => `${i}: ${l}`).join("\n")}`;

/** The whole reading in kana: furigana in place of each kanji run, katakana kept. */
export function kanaOf(reading: string): string {
  return parseMarkup(reading)
    .map((s) => s.ruby ?? s.text)
    .join("");
}

export interface CheckedPhrase {
  source: string;
  source_lang: "en" | "ms";
  meaning: string;
  jp: string;
  reading: string;
  kana: string;
  /** Dictionary forms of the content words used (食べる, コーヒー), to match the word list. */
  words: string[];
}

/** Keep translations that are well formed: furigana spell the sentence, the kana version has no kanji left. */
export function acceptTranslations(lines: string[], out: Translation): { kept: CheckedPhrase[]; failed: string[] } {
  const kept: CheckedPhrase[] = [];
  const done = new Set<number>();
  for (const p of out.phrases) {
    const source = lines[p.index];
    if (source === undefined || done.has(p.index)) continue;
    const jp = p.jp.trim();
    const reading = p.reading.trim();
    const kana = kanaOf(reading);
    const ok = jp && (!/[㐀-鿿]/.test(jp) || isMarkup(reading)) && stripMarkup(reading) === jp && !/[㐀-鿿A-Za-z]/.test(kana) && p.meaning.trim();
    if (!ok) continue;
    done.add(p.index);
    kept.push({ source, source_lang: p.lang, meaning: p.meaning.trim(), jp, reading, kana, words: cleanWords(p.words) });
  }
  return { kept, failed: lines.filter((_, i) => !done.has(i)) };
}

const MAX_WORDS = 15;

/** Japanese words only, trimmed, unique, at most MAX_WORDS. */
export const cleanWords = (words: string[]) =>
  [...new Set(words.map((w) => w.trim()).filter((w) => w.length > 0 && w.length <= 20 && /^[ぁ-ゖァ-ヺー々〆㐀-鿿]+$/.test(w)))].slice(0, MAX_WORDS);

/** Lines from a box of text: one phrase per line, blanks dropped, at most MAX_LINES. */
export const splitLines = (text: string) =>
  text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, MAX_LINES);
