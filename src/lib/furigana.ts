// Furigana: small kana readings shown above kanji (rendered with <ruby>).
//
// Readings come in two shapes:
// - plain kana for a word ("たべる"), aligned to the term at render time
//   (食べる + たべる → 食[た]べる);
// - ruby markup for sentences and examples, generated once from the
//   tokenizer when content is built: "[今日|きょう]は[雨|あめ]です".

export interface Segment {
  text: string;
  /** Kana reading to show above `text`; absent for kana, punctuation and latin. */
  ruby?: string;
}

const KANJI = /[㐀-鿿豈-﫿々〆ヵヶ]/;
const MARKUP = /\[([^\]|]+)\|([^\]]+)\]/g;

export const hasKanji = (s: string) => KANJI.test(s);
export const isMarkup = (s: string | null | undefined): boolean => !!s && /\[[^\]|]+\|[^\]]+\]/.test(s);

/** Parse "[漢字|かんじ]" markup into segments. */
export function parseMarkup(markup: string): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of markup.matchAll(MARKUP)) {
    if (m.index! > last) out.push({ text: markup.slice(last, m.index) });
    out.push({ text: m[1], ruby: m[2] });
    last = m.index! + m[0].length;
  }
  if (last < markup.length) out.push({ text: markup.slice(last) });
  return out;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const toHiragana = (s: string) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

/**
 * Align a word's kana reading to its kanji: kana in the term must match the
 * reading literally, and each kanji run takes the kana between them.
 * Falls back to one reading over the whole term when it can't align.
 */
export function alignReading(term: string, reading: string): Segment[] {
  const cleanReading = reading.replace(/\s*\(.*?\)\s*/g, "").split(/[;；]/)[0].trim();
  if (!hasKanji(term) || !cleanReading || term.includes(";")) return hasKanji(term) && cleanReading ? [{ text: term, ruby: cleanReading }] : [{ text: term }];

  const runs = term.match(new RegExp(`${KANJI.source}+|[^${KANJI.source.slice(1, -1)}]+`, "g")) ?? [term];
  const pattern = runs.map((r) => (hasKanji(r) ? "(.+?)" : `(${escapeRe(toHiragana(r))})`)).join("");
  const m = toHiragana(cleanReading).match(new RegExp(`^${pattern}$`));
  if (!m) return [{ text: term, ruby: cleanReading }];
  return runs.map((r, i) => (hasKanji(r) ? { text: r, ruby: m[i + 1] } : { text: r }));
}

/** Segments for any Japanese text: markup if it has it, else aligned to a plain reading, else as-is. */
export function furiganaSegments(text: string, reading?: string | null): Segment[] {
  if (isMarkup(text)) return parseMarkup(text);
  if (reading && isMarkup(reading)) return parseMarkup(reading);
  if (reading && hasKanji(text)) return alignReading(text, reading);
  return [{ text }];
}

/** Turn segments back into markup, e.g. for multiple-choice option strings. */
export function toMarkup(segments: Segment[]): string {
  return segments.map((s) => (s.ruby ? `[${s.text}|${s.ruby}]` : s.text)).join("");
}

/** Plain text of markup (no readings), for comparisons and logs. */
export function stripMarkup(text: string): string {
  return text.replace(MARKUP, "$1");
}
