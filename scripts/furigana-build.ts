import { join } from "node:path";
import kuromoji from "kuromoji";
import { alignReading, hasKanji, isMarkup, toMarkup, type Segment } from "../src/lib/furigana";

// Build-time furigana for sentences and examples. Kuromoji tokenizes the text
// and supplies each word's reading; the result is stored as ruby markup
// ("[今日|きょう]は[雨|あめ]") so the app never needs the 18 MB dictionary.

const toHiragana = (s: string) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

export type Annotate = (text: string) => string | undefined;

/** Everyday readings the tokenizer gets wrong or picks the formal variant of. */
const READING_OVERRIDES: Record<string, string> = {
  日本: "にほん",
  日本人: "にほんじん",
  今日: "きょう",
  明日: "あした",
  昨日: "きのう",
  一人: "ひとり",
  二人: "ふたり",
  大人: "おとな",
  上手: "じょうず",
  下手: "へた",
};

/** Longest run of tokens to try against the vocabulary when fixing readings. */
const MAX_WORD_TOKENS = 4;

/**
 * `knownWords` maps vocabulary terms to their checked kana readings. When
 * consecutive tokens spell one of them (一 + 人 → 一人), its reading wins
 * over the tokenizer's guess (ひとり, not いちにん).
 */
export async function createAnnotator(vocabulary: Map<string, string> = new Map()): Promise<Annotate> {
  const knownWords = new Map([...vocabulary, ...Object.entries(READING_OVERRIDES)]);
  const tokenizer = await new Promise<kuromoji.Tokenizer<kuromoji.IpadicFeatures>>((resolve, reject) =>
    kuromoji
      .builder({ dicPath: join(process.cwd(), "node_modules", "kuromoji", "dict") })
      .build((err, t) => (err ? reject(err) : resolve(t))),
  );
  return (text: string) => {
    if (!hasKanji(text)) return undefined;
    const tokens = tokenizer.tokenize(text);
    const segments: Segment[] = [];
    for (let i = 0; i < tokens.length; ) {
      let matched = 0;
      for (let n = Math.min(MAX_WORD_TOKENS, tokens.length - i); n >= 2 && !matched; n--) {
        const surface = tokens.slice(i, i + n).map((t) => t.surface_form).join("");
        const known = knownWords.get(surface);
        if (known && hasKanji(surface)) {
          segments.push(...alignReading(surface, known));
          matched = n;
        }
      }
      if (matched) {
        i += matched;
        continue;
      }
      const t = tokens[i++];
      // 何 is なん before で/だ/の/と and counters (何ですか, 何時, 何人); the tokenizer usually says なに.
      if (t.surface_form === "何" && /^[でだのと時人回日歳枚本年月曜分]/.test(tokens[i]?.surface_form ?? "")) {
        segments.push({ text: "何", ruby: "なん" });
        continue;
      }
      const known = knownWords.get(t.surface_form);
      const reading = known ?? (t.reading && t.reading !== "*" ? toHiragana(t.reading) : null);
      segments.push(...(hasKanji(t.surface_form) && reading ? alignReading(t.surface_form, reading) : [{ text: t.surface_form }]));
    }
    return toMarkup(segments);
  };
}

type Example = { jp: string; en: string; reading?: string };
type ItemRecord = Record<string, unknown> & { type: string; term: string; reading?: string; examples?: Example[] };

/** Add markup to example sentences and sentence items that have kanji and no reading yet. */
export function annotateItems<T extends ItemRecord>(records: T[], annotate: Annotate): T[] {
  return records.map((r) => {
    const examples = r.examples?.map((e) => (e.reading || !hasKanji(e.jp) ? e : { ...e, reading: annotate(e.jp) }));
    const sentenceReading =
      r.type === "sentence" && !isMarkup(r.reading) && hasKanji(r.term) ? annotate(r.term) : undefined;
    return {
      ...r,
      ...(examples ? { examples } : {}),
      ...(sentenceReading ? { reading: sentenceReading } : {}),
    };
  });
}

/** Vocabulary terms with a single plain kana reading, for createAnnotator. */
export function knownWordsFrom(records: ItemRecord[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const r of records) {
    if (r.type !== "word" || !r.reading || !hasKanji(r.term) || /[;；～〜]/.test(r.term + r.reading) || isMarkup(r.reading)) continue;
    if (!map.has(r.term)) map.set(r.term, r.reading.replace(/\s*\(.*?\)\s*/g, ""));
  }
  return map;
}
