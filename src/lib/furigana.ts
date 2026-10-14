// Furigana: small kana readings shown above kanji (rendered with <ruby>).
//
// Readings come in two shapes:
// - plain kana for a word ("たべる"), aligned to the term at render time
//   (食べる + たべる → 食[た]べる);
// - ruby markup for sentences and examples, generated once from the
//   tokenizer when content is built: "[今日|きょう]は[雨|あめ]です".
//
// Sentences also carry grammar roles, marked ⟨s⟩…⟨/⟩ around the parts they
// cover: s = subject/topic (before が/は), o = object (before を), v = verb
// or copula, p = particle. The markup with roles reads:
//   "⟨s⟩[私|わたし]⟨/⟩⟨p⟩は⟨/⟩⟨o⟩りんご⟨/⟩⟨p⟩を⟨/⟩⟨v⟩[食|た]べます⟨/⟩。"

export type Role = "s" | "o" | "v" | "p";

export interface Segment {
  text: string;
  /** Kana reading to show above `text`; absent for kana, punctuation and latin. */
  ruby?: string;
  /** Grammar role, for colour-coding sentences. */
  role?: Role;
}

const KANJI = /[㐀-鿿豈-﫿々〆ヵヶ]/;
const MARKUP = /\[([^\]|]+)\|([^\]]+)\]/g;
const ROLE_MARK = /⟨[sovp/]⟩/g;
const TOKEN = /⟨([sovp])⟩|⟨\/⟩|\[([^\]|]+)\|([^\]]+)\]/g;

export const hasKanji = (s: string) => KANJI.test(s);
export const isMarkup = (s: string | null | undefined): boolean => !!s && (/\[[^\]|]+\|[^\]]+\]/.test(s) || /⟨[sovp]⟩/.test(s));

/** Parse "[漢字|かんじ]" markup (and ⟨role⟩ spans) into segments. */
export function parseMarkup(markup: string): Segment[] {
  const out: Segment[] = [];
  let role: Role | undefined;
  let last = 0;
  const text = (t: string) => t && out.push(role ? { text: t, role } : { text: t });
  for (const m of markup.matchAll(TOKEN)) {
    text(markup.slice(last, m.index));
    if (m[2]) out.push(role ? { text: m[2], ruby: m[3], role } : { text: m[2], ruby: m[3] });
    else role = (m[1] as Role | undefined) ?? undefined;
    last = m.index! + m[0].length;
  }
  text(markup.slice(last));
  return out;
}

/** Markup without its role marks (furigana kept). */
export const stripRoles = (text: string) => text.replace(ROLE_MARK, "");

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

/** Turn segments back into markup, e.g. for multiple-choice option strings. Runs of one role share a span. */
export function toMarkup(segments: Segment[]): string {
  let out = "";
  let open: Role | undefined;
  for (const s of segments) {
    if (s.role !== open) {
      if (open) out += "⟨/⟩";
      if (s.role) out += `⟨${s.role}⟩`;
      open = s.role;
    }
    out += s.ruby ? `[${s.text}|${s.ruby}]` : s.text;
  }
  return open ? out + "⟨/⟩" : out;
}

/** Plain text of markup (no readings, no roles), for comparisons and logs. */
export function stripMarkup(text: string): string {
  return text.replace(ROLE_MARK, "").replace(MARKUP, "$1");
}
