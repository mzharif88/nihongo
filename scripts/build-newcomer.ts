/**
 * Newcomer starter library: content/newcomer/starter.source.json →
 * starter.json, adding furigana markup (reading) and the whole phrase in
 * kana (kana) to every phrase. Run with `npm run build:newcomer`.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hasKanji, stripMarkup } from "../src/lib/furigana";
import { kanaOf } from "../src/lib/newcomer/translate";
import { teachingAnnotator } from "./build-lessons";

const DIR = join(process.cwd(), "content", "newcomer");

// reading pins the furigana where the tokenizer gets it wrong (マレーシア人 じん, 十分 じゅっぷん).
type SourcePhrase = { slug: string; stage: number; en: string; ms: string; jp: string; reading?: string };
type SourceTopic = { slug: string; title: string; description: string; phrases: SourcePhrase[] };

async function main() {
  const annotate = await teachingAnnotator();
  const source = JSON.parse(readFileSync(join(DIR, "starter.source.json"), "utf8")) as { topics: SourceTopic[] };
  const topics = source.topics.map((t) => ({
    ...t,
    phrases: t.phrases.map((p) => {
      const reading = p.reading ?? (hasKanji(p.jp) ? (annotate(p.jp) ?? p.jp) : p.jp);
      if (stripMarkup(reading) !== p.jp) throw new Error(`${p.slug}: reading doesn't spell the phrase: ${reading}`);
      const kana = kanaOf(reading);
      if (hasKanji(kana)) throw new Error(`${p.slug}: kana still has kanji: ${kana}`);
      return { ...p, reading, kana };
    }),
  }));
  writeFileSync(join(DIR, "starter.json"), JSON.stringify({ version: 1, topics }, null, 1) + "\n");
  console.log(`starter.json: ${topics.length} topics, ${topics.reduce((n, t) => n + t.phrases.length, 0)} phrases`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
