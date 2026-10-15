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
  // Suffixes the tokenizer splits off and reads as words of their own.
  今日中: "きょうじゅう",
  今日中っ: "きょうじゅうっ",
  専門家: "せんもんか",
  仕事柄: "しごとがら",
  作品名: "さくひんめい",
  対象外: "たいしょうがい",
  予算内: "よさんない",
  利用日: "りようび",
  上々: "じょうじょう",
  自撮: "じど",
};

/** Single-kanji suffixes read differently straight after a kanji noun (参加者 さんかしゃ, 山田様 やまださま). */
const NOUN_SUFFIXES: Record<string, string> = { 者: "しゃ", 様: "さま", 後: "ご", 店: "てん" };

const KANJI_DIGITS = "〇一二三四五六七八九";
const isKanjiNumber = (s: string) => /^[〇一二三四五六七八九十百千万]+$/.test(s);

function kanjiNumberValue(s: string): number {
  let total = 0;
  let section = 0;
  let digit = 0;
  for (const c of s) {
    const d = KANJI_DIGITS.indexOf(c);
    if (d >= 0) digit = digit * 10 + d;
    else if (c === "万") {
      total += (section + digit || 1) * 10_000;
      section = digit = 0;
    } else {
      section += (digit || 1) * { 十: 10, 百: 100, 千: 1000 }[c as "十" | "百" | "千"];
      digit = 0;
    }
  }
  return total + section + digit;
}

const ONES = ["", "いち", "に", "さん", "よん", "ご", "ろく", "なな", "はち", "きゅう"];

/** Plain reading of a number (3,600 → さんぜんろっぴゃく). */
export function numberReading(n: number): string {
  if (n >= 10_000) return numberReading(Math.floor(n / 10_000)) + "まん" + (n % 10_000 ? numberReading(n % 10_000) : "");
  const th = Math.floor(n / 1000), h = Math.floor((n % 1000) / 100), t = Math.floor((n % 100) / 10), o = n % 10;
  return (
    (th ? ({ 1: "せん", 3: "さんぜん", 8: "はっせん" } as Record<number, string>)[th] ?? ONES[th] + "せん" : "") +
    (h ? ({ 1: "ひゃく", 3: "さんびゃく", 6: "ろっぴゃく", 8: "はっぴゃく" } as Record<number, string>)[h] ?? ONES[h] + "ひゃく" : "") +
    (t ? (t === 1 ? "" : ONES[t]) + "じゅう" : "") +
    ONES[o]
  );
}

const DAYS: Record<number, string> = {
  2: "ふつか", 3: "みっか", 4: "よっか", 5: "いつか", 6: "むいか", 7: "なのか", 8: "ようか", 9: "ここのか",
  10: "とおか", 14: "じゅうよっか", 20: "はつか", 24: "にじゅうよっか",
};

/** Counters whose reading the tokenizer gets wrong after a number. */
const COUNTERS = new Set(["人", "年", "分", "回", "階", "個", "歳", "曲", "時", "日"]);

/** Reading of a number plus counter, sound changes included (四人 よにん, 三十分 さんじゅっぷん); null if unsure. */
export function counterReading(n: number | "何", counter: string): string | null {
  if (n === "何") {
    const what: Record<string, string> = { 人: "なんにん", 年: "なんねん", 分: "なんぷん", 回: "なんかい", 階: "なんがい", 個: "なんこ", 歳: "なんさい", 曲: "なんきょく", 時: "なんじ", 日: "なんにち" };
    return what[counter] ?? null;
  }
  if (counter === "日") return n === 1 ? null : (DAYS[n] ?? numberReading(n) + "にち");
  if (counter === "人" && (n === 1 || n === 2)) return n === 1 ? "ひとり" : "ふたり";
  const o = n % 10;
  const head = numberReading(n - o);
  if (o === 0) {
    // 十 at the end doubles before a k/s/p counter: じゅっかい, さんじゅっぷん.
    const geminate = ["分", "回", "階", "個", "歳", "曲"].includes(counter) && head.endsWith("じゅう");
    const base = geminate ? head.slice(0, -1) + "っ" : head;
    const tail: Record<string, string> = { 分: geminate ? "ぷん" : "ふん", 回: "かい", 階: "かい", 個: "こ", 歳: "さい", 曲: "きょく", 人: "にん", 年: "ねん", 時: "じ" };
    return base + tail[counter];
  }
  const forms: Record<string, Record<number, string>> = {
    人: { 4: "よにん", 7: "ななにん" },
    年: { 4: "よねん", 7: "ななねん", 9: "きゅうねん" },
    時: { 4: "よじ", 7: "しちじ", 9: "くじ" },
    分: { 1: "いっぷん", 3: "さんぷん", 4: "よんぷん", 6: "ろっぷん", 8: "はっぷん", 2: "にふん", 5: "ごふん", 7: "ななふん", 9: "きゅうふん" },
    回: { 1: "いっかい", 6: "ろっかい", 8: "はっかい" },
    階: { 1: "いっかい", 3: "さんがい", 6: "ろっかい", 8: "はっかい" },
    個: { 1: "いっこ", 6: "ろっこ", 8: "はっこ" },
    歳: { 1: "いっさい", 8: "はっさい" },
    曲: { 1: "いっきょく", 6: "ろっきょく", 8: "はっきょく" },
  };
  const plain: Record<string, string> = { 人: "にん", 年: "ねん", 時: "じ", 分: "ふん", 回: "かい", 階: "かい", 個: "こ", 歳: "さい", 曲: "きょく" };
  return head + (forms[counter]?.[o] ?? ONES[o] + plain[counter]);
}

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
      // A number (kanji, or 何) straight before a counter: read the pair together.
      const numberEnd = (() => {
        if (tokens[i].surface_form === "何") return i + 1;
        let j = i;
        while (j < tokens.length && isKanjiNumber(tokens[j].surface_form)) j++;
        return j;
      })();
      const counter = tokens[numberEnd]?.surface_form;
      if (numberEnd > i && counter && COUNTERS.has(counter)) {
        const number = tokens.slice(i, numberEnd).map((t) => t.surface_form).join("");
        const reading = counterReading(number === "何" ? "何" : kanjiNumberValue(number), counter);
        if (reading) {
          segments.push({ text: number + counter, ruby: reading });
          i = numberEnd + 1;
          continue;
        }
      }
      // Arabic digits + 日: なのか, とおか, じゅうごにち (the tokenizer says ひ).
      if (tokens[i + 1]?.surface_form === "日" && /^[0-9０-９]+$/.test(tokens[i].surface_form)) {
        const n = Number(tokens[i].surface_form.replace(/[０-９]/g, (c) => String(c.charCodeAt(0) - 0xff10)));
        const reading = counterReading(n, "日");
        if (reading) {
          segments.push({ text: tokens[i].surface_form + "日", ruby: reading });
          i += 2;
          continue;
        }
      }
      const prev = tokens[i - 1];
      const t = tokens[i++];
      const suffix = NOUN_SUFFIXES[t.surface_form];
      if (suffix && prev && hasKanji(prev.surface_form) && prev.pos === "名詞" && prev.pos_detail_1 !== "副詞可能") {
        segments.push({ text: t.surface_form, ruby: suffix });
        continue;
      }
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

/**
 * Annotate text that may already pin some readings with markup
 * ("number + [時|じ]"): the pinned parts stay, the rest is annotated.
 */
export function annotateMixed(text: string, annotate: Annotate): string {
  return text
    .split(/(\[[^\]|]+\|[^\]]+\])/)
    .map((part) => (isMarkup(part) || !hasKanji(part) ? part : (annotate(part) ?? part)))
    .join("");
}
