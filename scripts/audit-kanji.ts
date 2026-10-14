/**
 * Audit: kanji above each piece of content's JLPT level. The exam at a level
 * prints only that level's kanji and lower ones; anything else is kana.
 *
 *   npx tsx scripts/audit-kanji.ts [--list]
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { stripMarkup } from "../src/lib/furigana";
import { kanjiAbove } from "../src/lib/kanji-levels";

const CONTENT = join(process.cwd(), "content");
const SKIP_KEYS = new Set(["slug", "item_slugs", "grammar_slug", "mock_test_slug", "text_slug", "en", "english", "meaning", "mnemonic", "romaji", "source", "tags", "data", "reading", "template"]);
type Rec = Record<string, unknown> & { slug: string; jlpt_level?: string; type?: string };

/** Every Japanese string in a record (readings are skipped: they repeat the text as markup). */
function strings(v: unknown, key = ""): string[] {
  if (SKIP_KEYS.has(key)) return [];
  if (typeof v === "string") return [stripMarkup(v)];
  if (Array.isArray(v)) return v.flatMap((x) => strings(x));
  if (v && typeof v === "object") return Object.entries(v).flatMap(([k, x]) => strings(x, k));
  return [];
}

const packs: { name: string; records: Rec[] }[] = [];
const items = new Map<string, Rec>();
const itemFiles = ["legacy/01-items.json", ...readdirSync(join(CONTENT, "opendata")).map((f) => `opendata/${f}`), ...readdirSync(join(CONTENT, "grammar")).filter((f) => !f.includes("source")).map((f) => `grammar/${f}`)];
for (const f of itemFiles) for (const r of JSON.parse(readFileSync(join(CONTENT, f), "utf8")).records as Rec[]) items.set(r.slug, { ...(items.get(r.slug) ?? {}), ...r });
packs.push({ name: "items (words, grammar)", records: [...items.values()].filter((r) => r.type !== "kanji" && r.type !== "radical" && r.type !== "kana") });

for (const dir of ["lessons", "builder", "mock", "reading", "listening", "legacy"])
  for (const f of readdirSync(join(CONTENT, dir)).filter((f) => f.endsWith(".json") && !f.includes("source") && !f.includes("01-items"))) {
    const doc = JSON.parse(readFileSync(join(CONTENT, dir, f), "utf8"));
    if (doc.kind === "mock_tests") continue;
    packs.push({ name: `${dir}/${f}`, records: doc.records });
  }

const list = process.argv.includes("--list");
const total = new Map<string, number>();
for (const p of packs) {
  const byLevel = new Map<string, { records: number; flagged: number; kanji: Map<string, number> }>();
  for (const r of p.records) {
    const level = r.jlpt_level ?? "N5";
    const s = byLevel.get(level) ?? { records: 0, flagged: 0, kanji: new Map() };
    byLevel.set(level, s);
    s.records++;
    const above = kanjiAbove(strings(r).join("\n"), level);
    if (above.length) s.flagged++;
    for (const k of above) {
      s.kanji.set(k, (s.kanji.get(k) ?? 0) + 1);
      total.set(level, (total.get(level) ?? 0) + 1);
    }
    if (list && above.length) console.log(`  ${level} ${r.slug}: ${above.join("")}`);
  }
  for (const [level, s] of [...byLevel].sort()) {
    if (!s.flagged) continue;
    const top = [...s.kanji].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k]) => k).join("");
    console.log(`${p.name} ${level}: ${s.flagged}/${s.records} records use ${s.kanji.size} kanji above ${level} (e.g. ${top})`);
  }
}
