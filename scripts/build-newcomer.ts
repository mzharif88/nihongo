/**
 * Newcomer content: starter.source.json → starter.json (the phrase
 * library) and listening.source.json → listening.json (graded scenes),
 * adding furigana markup (reading) and the whole line in kana (kana) to
 * every phrase and line. Run with `npm run build:newcomer`.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hasKanji, stripMarkup } from "../src/lib/furigana";
import { kanaOf } from "../src/lib/newcomer/translate";
import { teachingAnnotator } from "./build-lessons";

const DIR = join(process.cwd(), "content", "newcomer");

// reading pins the furigana where the tokenizer gets it wrong (マレーシア人 じん, 十分 じゅっぷん).
type SourcePhrase = { slug: string; stage: number; en: string; ms: string; jp: string; reading?: string };
type SourceTopic = { slug: string; title: string; description: string; phrases: SourcePhrase[] };

type Annotate = Awaited<ReturnType<typeof teachingAnnotator>>;

/** Furigana and kana for one line; `pinned` overrides the tokenizer where it reads wrong. */
function readingsFor(slug: string, jp: string, annotate: Annotate, pinned?: string) {
  const reading = pinned ?? (hasKanji(jp) ? (annotate(jp) ?? jp) : jp);
  if (stripMarkup(reading) !== jp) throw new Error(`${slug}: reading doesn't spell the phrase: ${reading}`);
  const kana = kanaOf(reading);
  if (hasKanji(kana)) throw new Error(`${slug}: kana still has kanji: ${kana}`);
  return { reading, kana };
}

type SourceLine = { speaker: "A" | "B"; jp: string; en: string; ms: string; reading?: string };
type SourceScene = { slug: string; lines: SourceLine[] } & Record<string, unknown>;

function buildListening(annotate: Annotate) {
  const file = join(DIR, "listening.source.json");
  if (!existsSync(file)) return;
  const source = JSON.parse(readFileSync(file, "utf8")) as { scenes: SourceScene[] };
  const scenes = source.scenes.map((s) => ({
    ...s,
    lines: s.lines.map((l, i) => ({ ...l, ...readingsFor(`${s.slug}#${i}`, l.jp, annotate, l.reading) })),
  }));
  writeFileSync(join(DIR, "listening.json"), JSON.stringify({ version: 1, scenes }, null, 1) + "\n");
  console.log(`listening.json: ${scenes.length} scenes`);
}

async function main() {
  const annotate = await teachingAnnotator();
  buildListening(annotate);
  const source = JSON.parse(readFileSync(join(DIR, "starter.source.json"), "utf8")) as { topics: SourceTopic[] };
  const topics = source.topics.map((t) => ({
    ...t,
    phrases: t.phrases.map((p) => ({ ...p, ...readingsFor(p.slug, p.jp, annotate, p.reading) })),
  }));
  writeFileSync(join(DIR, "starter.json"), JSON.stringify({ version: 1, topics }, null, 1) + "\n");
  console.log(`starter.json: ${topics.length} topics, ${topics.reduce((n, t) => n + t.phrases.length, 0)} phrases`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
