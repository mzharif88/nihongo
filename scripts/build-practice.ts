/**
 * Build the mock-test and reading packs from their hand-written sources.
 *
 *   npm run build:practice
 *
 * content/mock/*.source.json    → <name>-test.json (mock_tests) + <name>-questions.json
 * content/reading/*.source.json → <name>-texts.json (texts) + <name>-questions.json
 *
 * Adds furigana markup (shown in review and reading, hidden during a mock),
 * resolves each question's `items` (word terms or grammar slugs) to item
 * slugs so a wrong answer can send them to SRS, and sets the mock's time
 * limit from the official minutes per question.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hasKanji } from "../src/lib/furigana";
import { IMPORT_FORMAT_VERSION, parseImport, type ContentKind } from "../src/lib/content/schema";
import { mockPapers, type Section } from "../src/lib/mock/format";
import { teachingAnnotator } from "./build-lessons";
import { annotateItems, annotateMixed, type Annotate } from "./furigana-build";
import { itemResolver, loadItems } from "./content-items";

const CONTENT = join(process.cwd(), "content");

interface SourceQuestion {
  section: Section;
  part?: string;
  passage?: string;
  prompt: string;
  options: string[];
  answer: number;
  explanation?: string;
  items?: string[];
}

/** Markup per line, keeping {{underline}} marks; text that already has markup stays. */
const marked = (annotate: Annotate) => (text: string) =>
  text
    .split("\n")
    .map((line) => (hasKanji(line) ? annotateMixed(line, annotate) : line))
    .join("\n");

function write(dir: string, file: string, kind: ContentKind, source: string, records: Record<string, unknown>[]) {
  const doc = { version: IMPORT_FORMAT_VERSION, kind, source, records };
  const parsed = parseImport(doc);
  if (parsed.issues.length) {
    for (const i of parsed.issues) console.error(`${file} #${i.index} ${i.slug ?? ""}: ${i.message}`);
    throw new Error(`${file}: ${parsed.issues.length} invalid record(s)`);
  }
  writeFileSync(join(CONTENT, dir, file), JSON.stringify(doc, null, 1) + "\n");
  console.log(`${dir}/${file}: ${records.length} ${kind}`);
}

function question(q: SourceQuestion, m: (s: string) => string, resolve: (r: string, w: string) => string, where: string) {
  return {
    section: q.section,
    ...(q.part ? { part: q.part } : {}),
    ...(q.passage ? { passage: m(q.passage) } : {}),
    prompt: m(q.prompt),
    // 表記 options are kanji look-alikes; furigana would give the answer away and misread the fakes.
    options: /表記/.test(q.part ?? "") ? q.options : q.options.map(m),
    answer: q.answer,
    ...(q.explanation ? { explanation: m(q.explanation) } : {}),
    item_slugs: [...new Set((q.items ?? []).map((r) => resolve(r, where)))],
  };
}

/** Hand-written grammar points → item packs (examples get furigana). */
function buildGrammar(annotate: Annotate) {
  const dir = join(CONTENT, "grammar");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".source.json"))) {
    const level = file.replace(".source.json", "").toUpperCase();
    const src = JSON.parse(readFileSync(join(dir, file), "utf8"));
    const records = annotateItems(
      (src.records as { slug: string; term: string; meaning: string; examples: { jp: string; en: string }[] }[]).map((g) => ({
        ...g,
        type: "grammar",
        jlpt_level: level,
        skill: "grammar",
        grammar_point: g.slug,
        tags: ["grammar"],
      })),
      annotate,
    );
    write("grammar", file.replace(".source.json", ".json"), "items", "original-grammar", records);
  }
}

async function main() {
  const annotate = await teachingAnnotator();
  const m = marked(annotate);
  buildGrammar(annotate);
  const resolve = itemResolver(loadItems());

  for (const file of readdirSync(join(CONTENT, "mock")).filter((f) => f.endsWith(".source.json"))) {
    const name = file.replace(".source.json", "");
    const src = JSON.parse(readFileSync(join(CONTENT, "mock", file), "utf8"));
    const test = src.mock_test as { slug: string; jlpt_level: string; title: string };
    const counts: Partial<Record<Section, number>> = {};
    for (const q of src.questions as SourceQuestion[]) counts[q.section] = (counts[q.section] ?? 0) + 1;
    const minutes = mockPapers(test.jlpt_level, counts).reduce((n, p) => n + p.minutes, 0);
    write("mock", `${name}-test.json`, "mock_tests", "original-mock", [{ ...test, time_limit_min: minutes }]);
    write(
      "mock",
      `${name}-questions.json`,
      "questions",
      "original-mock",
      (src.questions as SourceQuestion[]).map((q, i) => ({
        slug: `${test.slug}-${String(i + 1).padStart(2, "0")}`,
        mock_test_slug: test.slug,
        position: i + 1,
        jlpt_level: test.jlpt_level,
        ...question(q, m, resolve, `${test.slug} #${i + 1}`),
      })),
    );
  }

  for (const file of readdirSync(join(CONTENT, "reading")).filter((f) => f.endsWith(".source.json"))) {
    const name = file.replace(".source.json", "");
    const src = JSON.parse(readFileSync(join(CONTENT, "reading", file), "utf8"));
    const texts = src.texts as { slug: string; jlpt_level: string; title: string; body: string; questions: SourceQuestion[] }[];
    write(
      "reading",
      `${name}-texts.json`,
      "texts",
      "original-reading",
      texts.map((t) => ({ slug: t.slug, jlpt_level: t.jlpt_level, kind: "reading", title: m(t.title), body: m(t.body) })),
    );
    write(
      "reading",
      `${name}-questions.json`,
      "questions",
      "original-reading",
      texts.flatMap((t) =>
        t.questions.map((q, i) => ({
          slug: `${t.slug}-q${i + 1}`,
          text_slug: t.slug,
          position: i + 1,
          jlpt_level: t.jlpt_level,
          ...question({ ...q, section: "reading" }, m, resolve, `${t.slug} q${i + 1}`),
        })),
      ),
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
