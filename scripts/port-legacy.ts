/**
 * Port content from the old NihonGo! app (React+Vite, kept on the `legacy`
 * branch) into NihonGo! JLPT import files under content/legacy/.
 *
 *   npm run port:legacy
 *
 * Reads src/data/*.js straight from the legacy branch with `git show`, maps
 * each card to the new schema, validates every record, and writes one import
 * file per content kind. All records land as drafts with source
 * "legacy-nihongo" so they go through the admin review queue before going live.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { IMPORT_FORMAT_VERSION, parseImport, type ContentKind } from "../src/lib/content/schema";
import { annotateItems, createAnnotator, knownWordsFrom } from "./furigana-build";
import { applyMnemonics, loadMnemonics } from "./mnemonics";
import { dropMerged, loadMerges } from "./merges";

const LEGACY_REF = process.env.LEGACY_REF ?? "origin/legacy";
const OUT_DIR = join(process.cwd(), "content", "legacy");
const SOURCE = "legacy-nihongo";
const DATA_FILES = ["content.js", "vocab.js", "modules.js", "grammar.js"];

interface Card {
  character: string;
  romaji: string;
  english: string;
  example_jp?: string;
  example_en?: string;
  mnemonic?: string;
}
interface Collection {
  id: string;
  label: string;
  cards: Card[];
}
interface GrammarExercise {
  id: string;
  level: "N5" | "N4";
  point: string;
  sentence: string;
  options: string[];
  answer: number;
  hint?: string;
  explanation?: string;
  example?: string;
}
interface MockQuestion {
  section: string;
  q: string;
  options: string[];
  answer: number;
}
interface PatternPart {
  text: string;
  romaji: string;
  type: string;
  label: string;
}
interface Pattern {
  id: string;
  title: string;
  english: string;
  parts: PatternPart[];
  note?: string;
}

// Readable slugs for the old app's grammar points, so new content can reference them.
const GRAMMAR_SLUGS: Record<string, string> = {
  "は (topic marker)": "grammar-wa-topic",
  "が (subject marker)": "grammar-ga-subject",
  "を (object marker)": "grammar-wo-object",
  "に (destination)": "grammar-ni-destination",
  "で (location of action)": "grammar-de-location",
  "に vs で": "grammar-ni-vs-de",
  "も (also)": "grammar-mo-also",
  "の (possessive)": "grammar-no-possessive",
  "と (and/with)": "grammar-to-and-with",
  "から/まで (from/until)": "grammar-kara-made",
  "ます (polite present/future)": "grammar-masu",
  "ました (polite past)": "grammar-mashita",
  "ません (polite negative)": "grammar-masen",
  "ませんでした (past negative)": "grammar-masen-deshita",
  "てください (please do)": "grammar-te-kudasai",
  "ている (ongoing action)": "grammar-te-iru",
  "たい (want to)": "grammar-tai",
  "い-adjective (present)": "grammar-i-adj-present",
  "い-adjective past": "grammar-i-adj-past",
  "い-adjective negative": "grammar-i-adj-negative",
  "な-adjective": "grammar-na-adj",
  "どこ (where)": "grammar-doko",
  "なん vs なに (what)": "grammar-nan-vs-nani",
  "いつ (when)": "grammar-itsu",
  "じゃないです (not)": "grammar-ja-nai-desu",
  "ね vs よ (sentence particles)": "grammar-ne-vs-yo",
  "もう vs まだ": "grammar-mou-vs-mada",
  "あります vs います": "grammar-arimasu-vs-imasu",
  "てもいいですか (may I?)": "grammar-te-mo-ii",
  "から (because/reason)": "grammar-kara-reason",
  "ことができる (can do)": "grammar-koto-ga-dekiru",
  "たことがある (have done before)": "grammar-ta-koto-ga-aru",
  "ながら (while doing)": "grammar-nagara",
  "てから (after doing)": "grammar-te-kara",
  "ために (in order to)": "grammar-tame-ni",
};

// ─── helpers ────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Hands out unique slugs: `word-ame`, then `word-ame-2`, ... */
function slugAllocator() {
  const used = new Set<string>();
  return (base: string) => {
    let s = base;
    for (let n = 2; used.has(s); n++) s = `${base}-${n}`;
    used.add(s);
    return s;
  };
}

function examples(card: Card) {
  if (!card.example_jp || !card.example_en) return [];
  return [{ jp: card.example_jp.trim(), en: card.example_en.trim() }];
}

function clean<T extends Record<string, unknown>>(record: T): T {
  return Object.fromEntries(Object.entries(record).filter(([, v]) => v !== undefined && v !== "")) as T;
}

async function loadLegacy() {
  const dir = mkdtempSync(join(tmpdir(), "nihongo-legacy-"));
  try {
    writeFileSync(join(dir, "package.json"), '{"type":"module"}');
    for (const f of DATA_FILES) {
      const src = execFileSync("git", ["show", `${LEGACY_REF}:src/data/${f}`], { encoding: "utf8", maxBuffer: 1 << 26 });
      writeFileSync(join(dir, f), src);
    }
    const load = (f: string) => import(pathToFileURL(join(dir, f)).href);
    const [content, vocab, modules, grammar] = await Promise.all(DATA_FILES.map(load));
    return { content, vocab, modules, grammar };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ─── mapping ────────────────────────────────────────────────────────────────

function buildItems(data: Awaited<ReturnType<typeof loadLegacy>>) {
  const { content, vocab, modules, grammar } = data;
  const slug = slugAllocator();
  const items: Record<string, unknown>[] = [];
  const seenTerms = new Set<string>();

  const add = (record: Record<string, unknown> & { term: string; type: string }) => {
    const key = `${record.type}:${record.term}`;
    if (seenTerms.has(key)) return;
    seenTerms.add(key);
    items.push(clean(record));
  };

  // Kana
  const kanaSets: [string, string, Card[]][] = [
    ["hiragana", "basic", content.HIRAGANA_BEGINNER],
    ["hiragana", "dakuten", modules.HIRAGANA_DAKUTEN],
    ["hiragana", "combo", modules.HIRAGANA_COMBOS],
    ["katakana", "basic", content.KATAKANA_BEGINNER],
    ["katakana", "dakuten", modules.KATAKANA_DAKUTEN],
    ["katakana", "combo", modules.KATAKANA_COMBOS],
  ];
  for (const [script, group, cards] of kanaSets) {
    for (const c of cards) {
      add({
        slug: slug(`kana-${script}-${slugify(c.romaji)}`),
        type: "kana",
        jlpt_level: "preN5",
        term: c.character,
        romaji: c.romaji,
        meaning: c.english,
        mnemonic: c.mnemonic,
        examples: examples(c),
        skill: "script",
        topic: script,
        tags: [script, group],
      });
    }
  }

  // Radicals (from the old kanji → radical map), then kanji that require them.
  const radicalSlugs = new Map<string, string>();
  const radicalMap = content.KANJI_RADICALS as Record<string, { char: string; meaning: string }[]>;
  for (const parts of Object.values(radicalMap)) {
    for (const r of parts) {
      if (radicalSlugs.has(r.char)) continue;
      const s = slug(`radical-${slugify(r.meaning.split("/")[0])}`);
      radicalSlugs.set(r.char, s);
      add({ slug: s, type: "radical", jlpt_level: "N5", term: r.char, meaning: r.meaning, skill: "kanji", tags: ["radical"] });
    }
  }

  const kanjiSets: [string, Card[]][] = [
    ["N5", content.KANJI_BEGINNER],
    ["N5", content.KANJI_N5_EXTENDED],
    ["N4", content.KANJI_INTERMEDIATE],
  ];
  for (const [level, cards] of kanjiSets) {
    for (const c of cards) {
      const radicals = (radicalMap[c.character] ?? []).map((r) => radicalSlugs.get(r.char)!);
      add({
        slug: slug(`kanji-${slugify(c.english.split("/")[0])}`),
        type: "kanji",
        jlpt_level: level,
        term: c.character,
        romaji: c.romaji,
        meaning: c.english,
        mnemonic: c.mnemonic,
        examples: examples(c),
        skill: "kanji",
        prerequisites: radicals,
        tags: ["kanji", ...(level === "N4" ? ["level-unverified"] : [])],
      });
    }
  }

  // Vocabulary: the old app never tagged words by JLPT level, so they land as
  // N5 with a "level-unverified" tag for the review queue.
  const vocabCollections: Collection[] = [
    ...vocab.WORD_COLLECTIONS,
    ...vocab.ANIMAL_COLLECTIONS,
    ...vocab.THINGS_COLLECTIONS,
    { id: "time", label: "Time & Calendar", cards: modules.TIME_CARDS },
    { id: "money", label: "Money & Prices", cards: modules.MONEY_CARDS },
    { id: "counting", label: "Counters", cards: modules.COUNTING_CARDS },
    { id: "expressions", label: "Expressions", cards: modules.EXPRESSIONS },
    { id: "misc", label: "Words", cards: [...content.VOCAB_WORDS, ...content.VOCAB_ANIMALS, ...content.VOCAB_THINGS] },
  ];
  for (const col of vocabCollections) {
    for (const c of col.cards) {
      add({
        slug: slug(`word-${slugify(c.romaji) || slugify(c.english)}`),
        type: "word",
        jlpt_level: "N5",
        term: c.character,
        romaji: c.romaji,
        meaning: c.english,
        mnemonic: c.mnemonic,
        examples: examples(c),
        skill: "vocabulary",
        topic: col.label,
        tags: ["level-unverified"],
      });
    }
  }

  // Sentences
  const sentenceSets: [string, string, Card[]][] = [
    ["N5", "jlpt", content.SENTENCES_N5],
    ["N4", "jlpt", content.SENTENCES_N4],
    ["N5", "common", modules.COMMON_SENTENCES],
  ];
  for (const [level, group, cards] of sentenceSets) {
    for (const c of cards) {
      add({
        slug: slug(`sentence-${slugify(c.english).slice(0, 48).replace(/-+$/, "")}`),
        type: "sentence",
        jlpt_level: level,
        term: c.character,
        romaji: c.romaji,
        meaning: c.english,
        mnemonic: c.mnemonic,
        examples: examples(c),
        skill: "reading",
        tags: [group, ...(group === "common" ? ["level-unverified"] : [])],
      });
    }
  }

  // Grammar points (one item per distinct point in the old exercises).
  const exercises: GrammarExercise[] = grammar.ALL_GRAMMAR;
  for (const ex of exercises) {
    const s = GRAMMAR_SLUGS[ex.point];
    if (!s) throw new Error(`No slug for legacy grammar point "${ex.point}" — add it to GRAMMAR_SLUGS`);
    if (seenTerms.has(`grammar:${ex.point}`)) continue;
    slug(s);
    add({
      slug: s,
      type: "grammar",
      jlpt_level: ex.level,
      term: ex.point,
      meaning: ex.hint ?? ex.point,
      skill: "grammar",
      grammar_point: s,
      examples: ex.example ? [{ jp: ex.example.split("→")[0].trim(), en: (ex.example.split("→")[1] ?? "").trim() || ex.point }] : [],
      tags: ["grammar"],
    });
  }

  return items;
}

function buildPracticeQuestions(exercises: GrammarExercise[]) {
  return exercises.map((ex) =>
    clean({
      slug: `practice-${slugify(ex.id)}`,
      jlpt_level: ex.level,
      section: "grammar",
      prompt: ex.sentence,
      options: ex.options,
      answer: ex.answer,
      explanation: [ex.explanation, ex.example].filter(Boolean).join("\n"),
      item_slugs: [GRAMMAR_SLUGS[ex.point]],
    }),
  );
}

function buildMocks(mockQuestions: Record<string, MockQuestion[]>, jlptMeta: Record<string, { time: number }>) {
  const tests: Record<string, unknown>[] = [];
  const questions: Record<string, unknown>[] = [];
  for (const [level, qs] of Object.entries(mockQuestions)) {
    const testSlug = `mock-legacy-${level.toLowerCase()}`;
    tests.push({
      slug: testSlug,
      jlpt_level: level,
      title: `Legacy mini mock ${level}`,
      time_limit_min: jlptMeta[level]?.time ?? 30,
    });
    qs.forEach((q, i) => {
      questions.push(
        clean({
          slug: `${testSlug}-${String(i + 1).padStart(2, "0")}`,
          mock_test_slug: testSlug,
          position: i + 1,
          jlpt_level: level,
          section: q.section.toLowerCase(),
          prompt: q.q,
          options: q.options,
          answer: q.answer,
          explanation: q.section === "Listening" ? "Ported from the old app; needs an audio clip before going live." : undefined,
        }),
      );
    });
  }
  return { tests, questions };
}

const SLOT_BY_TYPE: Record<string, string> = {
  subject: "noun",
  object: "noun",
  place: "place",
  time: "time",
  adjective: "i-adj",
};

function verbSlot(text: string) {
  if (text.endsWith("て")) return "verb-te";
  return "verb-masu";
}

function buildPatterns(patterns: Pattern[]) {
  return patterns.map((p) => {
    const template = p.parts.map((part) => {
      // Particles and the copula stay fixed; content words become typed slots
      // that keep the old example word as their default text.
      if (part.type === "particle" || part.text === "です") {
        return clean({ text: part.text, romaji: part.romaji, label: part.label });
      }
      const slot = part.type === "verb" ? verbSlot(part.text) : (SLOT_BY_TYPE[part.type] ?? "noun");
      return clean({ text: part.text, slot, romaji: part.romaji, label: part.label });
    });
    return clean({
      slug: `pattern-${slugify(p.id)}`,
      jlpt_level: "N5",
      title: p.title,
      english: p.english,
      template,
      examples: [{ jp: p.parts.map((x) => x.text).join(""), en: p.english }],
      notes: p.note,
    });
  });
}

// ─── main ───────────────────────────────────────────────────────────────────

function writeImport(file: string, kind: ContentKind, records: Record<string, unknown>[]) {
  const doc = { version: IMPORT_FORMAT_VERSION, kind, source: SOURCE, records };
  const parsed = parseImport(doc);
  if (parsed.issues.length) {
    for (const issue of parsed.issues) console.error(`${file} #${issue.index} ${issue.slug ?? ""}: ${issue.message}`);
    throw new Error(`${file}: ${parsed.issues.length} invalid record(s)`);
  }
  writeFileSync(join(OUT_DIR, file), JSON.stringify(doc, null, 2) + "\n");
  console.log(`${file}: ${records.length} ${kind}`);
}

async function main() {
  const data = await loadLegacy();
  mkdirSync(OUT_DIR, { recursive: true });

  const built = buildItems(data) as (Record<string, unknown> & { slug: string; type: string; term: string })[];
  const annotate = await createAnnotator(knownWordsFrom(built));
  const items = dropMerged(annotateItems(applyMnemonics(built, loadMnemonics()), annotate), loadMerges());
  const practice = buildPracticeQuestions(data.grammar.ALL_GRAMMAR);
  const mocks = buildMocks(data.content.MOCK_QUESTIONS, data.content.JLPT_META);
  const patterns = buildPatterns(data.modules.SENTENCE_PATTERNS);

  // Numbered so they import in dependency order (mock tests before their questions).
  writeImport("01-items.json", "items", items);
  writeImport("02-sentence-patterns.json", "sentence_patterns", patterns);
  writeImport("03-mock-tests.json", "mock_tests", mocks.tests);
  writeImport("04-questions.json", "questions", [...mocks.questions, ...practice]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
