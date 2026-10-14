/**
 * Build the lesson import packs: add furigana markup to the hand-written
 * lesson sources in content/lessons/*.source.json.
 *
 *   npm run build:lessons
 *
 * Dialogue lines get a `reading` field; titles, check prompts, options,
 * explanations and notes are rewritten as ruby markup, which <Ruby> renders
 * directly. Readings prefer the open-data vocabulary, like the item packs.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hasKanji, stripMarkup } from "../src/lib/furigana";
import { parseImport } from "../src/lib/content/schema";
import { annotateMixed, createAnnotator, knownWordsFrom, type Annotate } from "./furigana-build";
import { itemResolver, loadItems } from "./content-items";

const DIR = join(process.cwd(), "content", "lessons");
const OPEN_DATA = join(process.cwd(), "content", "opendata");

interface Check {
  prompt: string;
  options: string[];
  answer: number;
  explanation?: string;
}
interface Line {
  speaker: string;
  jp: string;
  en: string;
  reading?: string;
}
interface Lesson extends Record<string, unknown> {
  slug: string;
  title: string;
  dialogue: Line[];
  checks: Check[];
  notes?: string;
}

/**
 * Readings the tokenizer gets wrong in lesson text (counters and numbers,
 * mostly). Lessons teach 時 and 分 as counters, so they read じ and ふん here.
 */
const LESSON_READINGS: Record<string, string> = {
  分: "ふん",
  四時: "よじ",
  七時: "しちじ",
  九時: "くじ",
  七分: "ななふん",
  四百: "よんひゃく",
  三人: "さんにん",
  何名様: "なんめいさま",
  何日: "なんにち",
  何分: "なんぷん",
  三十分: "さんじゅっぷん",
  十年: "じゅうねん",
  卒業後: "そつぎょうご",
  一駅: "ひとえき",
  開いている: "あいている",
  何度: "なんど",
  午前中: "ごぜんちゅう",
  一日中: "いちにちじゅう",
  五十分: "ごじゅっぷん",
  仕事中: "しごとちゅう",
  の時: "のとき",
  来られ: "こられ",
  弾き: "ひき",
  雨が降り: "あめがふり",
  難し: "むずかし",
  着い: "つい",
  入ろう: "はいろう",
  四時間: "よじかん",
  一本: "いっぽん",
  時刻表: "じこくひょう",
  一位: "いちい",
  二位: "にい",
  管理人: "かんりにん",
  その時: "そのとき",
  た時: "たとき",
  その間: "そのあいだ",
  数人: "すうにん",
  他の: "ほかの",
  二人分: "ふたりぶん",
  三日分: "みっかぶん",
  保証人: "ほしょうにん",
  一か月: "いっかげつ",
  非常用: "ひじょうよう",
  二十七日: "にじゅうしちにち",
  三年: "さんねん",
  五年: "ごねん",
  一年: "いちねん",
  数年: "すうねん",
  二十人: "にじゅうにん",
  十二人: "じゅうににん",
  居住者: "きょじゅうしゃ",
  保護者: "ほごしゃ",
  三十一日: "さんじゅういちにち",
  三十日: "さんじゅうにち",
  十五日: "じゅうごにち",
  来月一日: "らいげつついたち",
  一泊: "いっぱく",
  一分: "いっぷん",
  一回: "いっかい",
  八歳: "はっさい",
  今日中: "きょうじゅう",
  工事中: "こうじちゅう",
  期間中: "きかんちゅう",
  この前行っ: "このまえいっ",
  唐揚げ: "からあげ",
  辛く: "からく",
  親子丼: "おやこどん",
  一人様: "ひとりさま",
  試着: "しちゃく",
  試着室: "しちゃくしつ",
  四十: "よんじゅう",
  三千: "さんぜん",
  八百: "はっぴゃく",
  六百: "ろっぴゃく",
};

/** Markup for text with kanji; text without kanji (or already marked up) stays as it is. */
const marked = (annotate: Annotate) => (text: string) => (hasKanji(text) ? annotateMixed(text, annotate) : text);

/** Notes are paragraphs; annotate each one so blank lines survive the tokenizer. */
const markedParagraphs = (annotate: Annotate) => (text: string) =>
  text.split("\n").map(marked(annotate)).join("\n");

export function annotateLesson(lesson: Lesson, annotate: Annotate): Lesson {
  const m = marked(annotate);
  return {
    ...lesson,
    title: m(lesson.title),
    dialogue: lesson.dialogue.map((l) => ({
      ...l,
      // jp may pin a reading inline ([十分|じゅっぷん]); keep jp plain for audio, the pin goes to reading.
      jp: stripMarkup(l.jp),
      speaker: m(l.speaker),
      ...(l.reading || !hasKanji(l.jp) ? {} : { reading: annotateMixed(l.jp, annotate) }),
    })),
    checks: lesson.checks.map((c) => ({
      ...c,
      prompt: m(c.prompt),
      options: c.options.map(m),
      ...(c.explanation ? { explanation: m(c.explanation) } : {}),
    })),
    ...(lesson.notes ? { notes: markedParagraphs(annotate)(lesson.notes) } : {}),
  };
}

/** The annotator for hand-written teaching content: open-data readings plus LESSON_READINGS. */
export async function teachingAnnotator(): Promise<Annotate> {
  const words = readdirSync(OPEN_DATA)
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => JSON.parse(readFileSync(join(OPEN_DATA, f), "utf8")).records);
  return createAnnotator(new Map([...knownWordsFrom(words), ...Object.entries(LESSON_READINGS)]));
}

async function main() {
  const annotate = await teachingAnnotator();
  const resolve = itemResolver(loadItems());

  for (const file of readdirSync(DIR).filter((f) => f.endsWith(".source.json"))) {
    const doc = JSON.parse(readFileSync(join(DIR, file), "utf8"));
    // item_slugs and grammar_slug may name words by spelling ("友達"); resolve them to slugs.
    const records = (doc.records as Lesson[]).map((l) => ({
      ...l,
      item_slugs: (l.item_slugs as string[]).map((r) => resolve(r, l.slug)),
      ...(l.grammar_slug ? { grammar_slug: resolve(l.grammar_slug as string, l.slug) } : {}),
    }));
    const out = { ...doc, records: records.map((l) => annotateLesson(l, annotate)) };
    const parsed = parseImport(out);
    if (parsed.issues.length) {
      for (const i of parsed.issues) console.error(`${file} #${i.index} ${i.slug ?? ""}: ${i.message}`);
      throw new Error(`${file}: ${parsed.issues.length} invalid lesson(s)`);
    }
    const target = file.replace(".source.json", ".json");
    writeFileSync(join(DIR, target), JSON.stringify(out, null, 1) + "\n");
    console.log(`${target}: ${out.records.length} lessons`);
  }
}

if (process.argv[1]?.endsWith("build-lessons.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
