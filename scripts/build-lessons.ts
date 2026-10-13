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
import { hasKanji, isMarkup } from "../src/lib/furigana";
import { parseImport } from "../src/lib/content/schema";
import { createAnnotator, knownWordsFrom, type Annotate } from "./furigana-build";

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
  時: "じ",
  分: "ふん",
  四時: "よじ",
  七時: "しちじ",
  九時: "くじ",
  七分: "ななふん",
  四百: "よんひゃく",
  三人: "さんにん",
  何名様: "なんめいさま",
};

/** Markup for text with kanji; text without kanji (or already marked up) stays as it is. */
const marked = (annotate: Annotate) => (text: string) =>
  !hasKanji(text) || isMarkup(text) ? text : (annotate(text) ?? text);

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
      speaker: m(l.speaker),
      ...(l.reading || !hasKanji(l.jp) ? {} : { reading: annotate(l.jp) }),
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

  for (const file of readdirSync(DIR).filter((f) => f.endsWith(".source.json"))) {
    const doc = JSON.parse(readFileSync(join(DIR, file), "utf8"));
    const out = { ...doc, records: (doc.records as Lesson[]).map((l) => annotateLesson(l, annotate)) };
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
