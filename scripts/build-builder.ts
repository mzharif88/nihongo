/**
 * Build the sentence-builder pack from content/builder/*.source.json.
 *
 *   npm run build:builder
 *
 * Each source exercise writes its sentence with / between tiles. The output
 * is a sentence_patterns import: the legacy pattern (template, title, notes)
 * with its examples replaced by the exercises, each carrying the sentence,
 * ruby markup for it, the tiles (as markup) and decoy tiles.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hasKanji, parseMarkup, toMarkup, type Segment } from "../src/lib/furigana";
import { parseImport } from "../src/lib/content/schema";
import { teachingAnnotator } from "./build-lessons";
import type { Annotate } from "./furigana-build";

const DIR = join(process.cwd(), "content", "builder");
const LEGACY_PATTERNS = join(process.cwd(), "content", "legacy", "02-sentence-patterns.json");

interface SourceExercise {
  jp: string;
  en: string;
  also?: string[];
  distractors?: string[];
}
interface SourcePattern extends Record<string, unknown> {
  slug: string;
  exercises: SourceExercise[];
}

/**
 * Cut a sentence's ruby segments at tile boundaries. A reading that spans two
 * tiles can't be cut, so those tiles fall back to being annotated alone.
 */
export function splitIntoTiles(segments: Segment[], tiles: string[], annotate: Annotate): string[] {
  const out: string[] = [];
  let seg = 0;
  let offset = 0; // characters of segments[seg] already used
  for (const tile of tiles) {
    const parts: Segment[] = [];
    let need = tile.length;
    let clean = true;
    while (need > 0 && seg < segments.length) {
      const s = segments[seg];
      const rest = s.text.length - offset;
      const take = Math.min(rest, need);
      if (s.ruby && (offset > 0 || take < s.text.length)) clean = false;
      parts.push({ text: s.text.slice(offset, offset + take), ...(s.ruby ? { ruby: s.ruby } : {}) });
      need -= take;
      offset += take;
      if (offset === s.text.length) {
        seg++;
        offset = 0;
      }
    }
    out.push(clean ? toMarkup(parts) : hasKanji(tile) ? (annotate(tile) ?? tile) : tile);
  }
  return out;
}

const plainOf = (s: string) => s.replace(/[。？！?!、\s]/g, "");

async function main() {
  const annotate = await teachingAnnotator();
  const legacy = new Map(
    (JSON.parse(readFileSync(LEGACY_PATTERNS, "utf8")).records as Record<string, unknown>[]).map((r) => [r.slug, r]),
  );

  for (const file of readdirSync(DIR).filter((f) => f.endsWith(".source.json"))) {
    const doc = JSON.parse(readFileSync(join(DIR, file), "utf8"));
    const records = (doc.records as SourcePattern[]).map(({ exercises, ...pattern }, position) => {
      const base = legacy.get(pattern.slug) ?? {};
      const examples = exercises.map((ex) => {
        const tiles = ex.jp.split("/");
        const sentence = tiles.join("");
        const jp = `${sentence}。`;
        const reading = hasKanji(sentence) ? annotate(sentence) : undefined;
        const marked = reading ? splitIntoTiles(parseMarkup(reading), tiles, annotate) : tiles;
        for (const a of ex.also ?? []) {
          if ([...plainOf(a)].sort().join("") !== [...sentence].sort().join("")) {
            throw new Error(`${pattern.slug}: "${a}" doesn't use the same tiles as "${sentence}"`);
          }
        }
        return {
          jp,
          en: ex.en,
          ...(reading ? { reading: `${reading}。` } : {}),
          tiles: marked,
          distractors: (ex.distractors ?? []).map((d) => (hasKanji(d) ? (annotate(d) ?? d) : d)),
          also: (ex.also ?? []).map(plainOf),
        };
      });
      return { ...base, ...pattern, position: position + 1, examples };
    });
    const out = { version: doc.version, kind: doc.kind, source: doc.source, records };
    const parsed = parseImport(out);
    if (parsed.issues.length) {
      for (const i of parsed.issues) console.error(`${file} #${i.index} ${i.slug ?? ""}: ${i.message}`);
      throw new Error(`${file}: ${parsed.issues.length} invalid pattern(s)`);
    }
    const target = file.replace(".source.json", ".json");
    writeFileSync(join(DIR, target), JSON.stringify(out, null, 1) + "\n");
    console.log(`${target}: ${records.length} patterns, ${records.reduce((n, r) => n + r.examples.length, 0)} exercises`);
  }
}

if (process.argv[1]?.endsWith("build-builder.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
