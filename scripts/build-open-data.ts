/**
 * Build N5–N2 kanji and vocabulary import packs from open data.
 *
 *   npm run build:open-data -- <download-dir>
 *
 * <download-dir> must contain:
 *   kanji.json        github.com/davidluzgouveia/kanji-data (KANJIDIC2 fields + Waller JLPT levels)
 *   n5.csv … n2.csv   github.com/jamsinclair/open-anki-jlpt-decks/src (Waller/tanos JLPT vocabulary)
 *
 * Only KANJIDIC-derived fields and JLPT levels are used; the WaniKani fields
 * in kanji.json (wk_*) are deliberately ignored, since that content isn't ours to reuse.
 *
 * Items that already exist in the legacy pack (same type and term) are
 * emitted as updates to the legacy record, keeping its slug, mnemonic and
 * examples, so nothing is duplicated and old progress stays attached.
 * Everything else gets a new slug namespace (kanji-u<codepoint>, vocab-…).
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "csv-parse/sync";
import { toRomaji } from "wanakana";
import { IMPORT_FORMAT_VERSION, parseImport } from "../src/lib/content/schema";
import { annotateItems, createAnnotator, knownWordsFrom, type Annotate } from "./furigana-build";
import { applyMnemonics, loadMnemonics } from "./mnemonics";
import { applyMergeTopics, loadMerges } from "./merges";
import { applyKanjiHints, loadHintData } from "./kanji-hints";

const LEVELS = ["N5", "N4", "N3", "N2"] as const;
type Level = (typeof LEVELS)[number];
const OUT_DIR = join(process.cwd(), "content", "opendata");
const LEGACY_ITEMS = join(process.cwd(), "content", "legacy", "01-items.json");

interface KanjiEntry {
  strokes: number | null;
  grade: number | null;
  freq: number | null;
  jlpt_new: number | null;
  meanings: string[];
  readings_on: string[];
  readings_kun: string[];
}

interface VocabRow {
  expression: string;
  reading: string;
  meaning: string;
}

type Item = Record<string, unknown> & { slug: string; type: string; term: string; jlpt_level: string; tags: string[] };

const levelFromNew = (n: number): Level | null => (({ 5: "N5", 4: "N4", 3: "N3", 2: "N2" }) as Record<number, Level>)[n] ?? null;

/** "ひと.つ" → "ひとつ", "-ひと" → "ひと": drop KANJIDIC's okurigana and affix markers. */
const cleanReading = (r: string) => r.replace(/[.\-]/g, "");

const romajiOf = (kana: string) => toRomaji(kana).replace(/\s+/g, "");

function slugBase(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
}

function slugAllocator(taken: Iterable<string>) {
  const used = new Set(taken);
  return (base: string) => {
    let s = base;
    for (let n = 2; used.has(s); n++) s = `${base}-${n}`;
    used.add(s);
    return s;
  };
}

function withoutUnverified(tags: string[], add: string[]): string[] {
  return [...new Set([...tags.filter((t) => t !== "level-unverified"), ...add])];
}

const MNEMONICS = loadMnemonics();
const MERGES = loadMerges();

function writePack(file: string, items: Item[], source: string, annotate: Annotate) {
  const records = applyKanjiHints(
    applyMergeTopics(annotateItems(applyMnemonics(items, MNEMONICS), annotate), MERGES),
    loadHintData(items),
  );
  const doc = { version: IMPORT_FORMAT_VERSION, kind: "items", source, records };
  const parsed = parseImport(doc);
  if (parsed.issues.length) {
    for (const i of parsed.issues.slice(0, 10)) console.error(`${file} #${i.index} ${i.slug ?? ""}: ${i.message}`);
    throw new Error(`${file}: ${parsed.issues.length} invalid record(s)`);
  }
  writeFileSync(join(OUT_DIR, file), JSON.stringify(doc, null, 1) + "\n");
  console.log(`${file}: ${records.length} items`);
}

async function main() {
  const dir = process.argv[2];
  if (!dir) throw new Error("Usage: npm run build:open-data -- <download-dir>");

  const legacy = JSON.parse(readFileSync(LEGACY_ITEMS, "utf8")).records as Item[];
  const legacyByKey = new Map(legacy.map((r) => [`${r.type}:${r.term}`, r]));
  const slug = slugAllocator(legacy.map((r) => r.slug));
  const updatedLegacy: Item[] = [];

  // ── Kanji ────────────────────────────────────────────────────────────────
  const kanji = JSON.parse(readFileSync(join(dir, "kanji.json"), "utf8")) as Record<string, KanjiEntry>;
  const kanjiByLevel = new Map<Level, Item[]>(LEVELS.map((l) => [l, []]));
  for (const [char, k] of Object.entries(kanji)) {
    const level = k.jlpt_new ? levelFromNew(k.jlpt_new) : null;
    if (!level) continue;
    const on = k.readings_on.map(cleanReading);
    const kun = k.readings_kun.map(cleanReading);
    const meanings = k.meanings.filter((m) => !/radical \(no\./i.test(m));
    const readings = [...new Set([...kun, ...on])];
    const fields = {
      jlpt_level: level,
      reading: (kun[0] ?? on[0]) || undefined,
      romaji: [...new Set(readings.map(romajiOf))].join("/") || undefined,
      data: { on, kun, strokes: k.strokes, grade: k.grade, freq: k.freq },
    };

    const existing = legacyByKey.get(`kanji:${char}`);
    if (existing) {
      updatedLegacy.push({ ...existing, ...fields, tags: withoutUnverified(existing.tags, ["jlpt-verified"]) });
      continue;
    }
    kanjiByLevel.get(level)!.push({
      slug: slug(`kanji-u${char.codePointAt(0)!.toString(16)}`),
      type: "kanji",
      term: char,
      meaning: meanings.join(", ") || "(no meaning listed)",
      skill: "kanji",
      tags: ["kanji", "jlpt-verified"],
      ...fields,
    });
  }

  // ── Vocabulary ───────────────────────────────────────────────────────────
  // A word listed at several levels belongs to the lowest one; repeated rows merge their meanings.
  const seen = new Set<string>();
  const vocabByLevel = new Map<Level, Item[]>(LEVELS.map((l) => [l, []]));
  for (const level of LEVELS) {
    const rows = parse(readFileSync(join(dir, `${level.toLowerCase()}.csv`), "utf8"), {
      columns: true,
      skip_empty_lines: true,
    }) as VocabRow[];
    const merged = new Map<string, { term: string; reading: string; meanings: string[] }>();
    for (const row of rows) {
      const term = row.expression.trim();
      const reading = row.reading.trim();
      if (!term || !row.meaning.trim()) continue;
      const key = `${term}|${reading}`;
      const entry = merged.get(key) ?? { term, reading, meanings: [] };
      entry.meanings.push(row.meaning.trim());
      merged.set(key, entry);
    }
    for (const [key, w] of merged) {
      if (seen.has(key)) continue;
      seen.add(key);
      const meaning = [...new Set(w.meanings)].join("; ").slice(0, 300);
      const fields = { jlpt_level: level, reading: w.reading || undefined, romaji: romajiOf(w.reading || w.term) };

      const existing = legacyByKey.get(`word:${w.term}`);
      if (existing) {
        updatedLegacy.push({ ...existing, ...fields, tags: withoutUnverified(existing.tags, ["jlpt-verified"]) });
        continue;
      }
      vocabByLevel.get(level)!.push({
        slug: slug(`vocab-${level.toLowerCase()}-${slugBase(fields.romaji) || "word"}`),
        type: "word",
        term: w.term,
        meaning,
        skill: "vocabulary",
        tags: ["jlpt-verified"],
        ...fields,
      });
    }
  }

  // A legacy item can match more than once (e.g. listed at two levels): keep its lowest level.
  const legacyUpdates = new Map<string, Item>();
  for (const r of updatedLegacy) if (!legacyUpdates.has(r.slug)) legacyUpdates.set(r.slug, r);

  mkdirSync(OUT_DIR, { recursive: true });
  const SOURCE = "opendata-kanjidic-tanos";
  const allWords = [...legacyUpdates.values(), ...[...vocabByLevel.values()].flat()];
  const annotate = await createAnnotator(knownWordsFrom(allWords));
  writePack("00-legacy-level-fixes.json", [...legacyUpdates.values()], "legacy-nihongo+opendata", annotate);
  LEVELS.forEach((level, i) => {
    writePack(`${String(i * 2 + 1).padStart(2, "0")}-kanji-${level.toLowerCase()}.json`, kanjiByLevel.get(level)!, SOURCE, annotate);
    writePack(`${String(i * 2 + 2).padStart(2, "0")}-vocab-${level.toLowerCase()}.json`, vocabByLevel.get(level)!, SOURCE, annotate);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
