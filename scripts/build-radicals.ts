/**
 * Build the radicals pack and link every N5–N2 kanji to its parts.
 *
 *   npm run build:radicals
 *
 * Parts come from KRADFILE (content/kanji-parts). A part that is itself a
 * kanji at or below the level of the kanji using it links to that kanji;
 * any other part is a radical item, at the level of the first kanji that
 * needs it, so radicals are learned just in time and never ahead of the
 * exam level. Single strokes (｜ノ丶亅乙) are skipped.
 *
 * Writes content/radicals/radicals.json (new radical items) and
 * content/radicals/kanji-links.json (prerequisites for each kanji item).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseImport } from "../src/lib/content/schema";
import { KANJI_BY_LEVEL } from "../src/lib/kanji-levels.generated";

const CONTENT = join(process.cwd(), "content");
const LEVELS = ["N5", "N4", "N3", "N2"] as const;
const STROKES = new Set(["｜", "ノ", "丶", "亅", "乙"]);
type Rec = { slug: string; type?: string; term?: string; jlpt_level?: string; meaning?: string; prerequisites?: string[]; mnemonic?: string };
const load = (f: string) => JSON.parse(readFileSync(join(CONTENT, f), "utf8")).records as Rec[];

const parts = JSON.parse(readFileSync(join(CONTENT, "kanji-parts", "kradfile.json"), "utf8")).parts as Record<string, string[]>;
const meanings = JSON.parse(readFileSync(join(CONTENT, "radicals", "meanings.json"), "utf8")).meanings as Record<string, string>;

const bySlug = new Map<string, Rec>();
for (const f of ["legacy/01-items.json", "opendata/00-legacy-level-fixes.json", "opendata/01-kanji-n5.json", "opendata/03-kanji-n4.json", "opendata/05-kanji-n3.json", "opendata/07-kanji-n2.json"])
  for (const r of load(f)) bySlug.set(r.slug, { ...(bySlug.get(r.slug) ?? {}), ...r });

const rank = new Map<string, number>();
LEVELS.forEach((l, i) => [...KANJI_BY_LEVEL[l]].forEach((k) => rank.set(k, i)));
const kanjiSlug = new Map<string, string>();
for (const r of bySlug.values()) if (r.type === "kanji" && r.term && rank.has(r.term) && !kanjiSlug.has(r.term)) kanjiSlug.set(r.term, r.slug);
const radicalSlug = new Map<string, string>();
for (const r of bySlug.values()) if (r.type === "radical" && r.term && !radicalSlug.has(r.term)) radicalSlug.set(r.term, r.slug);

const hex = (c: string) => c.codePointAt(0)!.toString(16);
const newRadicals = new Map<string, { level: number }>();
const links: { slug: string; prerequisites: string[] }[] = [];

for (const [k, level] of [...rank].sort((a, b) => a[1] - b[1])) {
  const slug = kanjiSlug.get(k);
  if (!slug) continue;
  const prereq: string[] = [];
  for (const p of parts[k] ?? []) {
    if (STROKES.has(p) || p === k) continue;
    const asKanji = rank.has(p) && rank.get(p)! <= level ? kanjiSlug.get(p) : undefined;
    if (asKanji) prereq.push(asKanji);
    else if (radicalSlug.has(p)) prereq.push(radicalSlug.get(p)!);
    else {
      if (!meanings[p]) throw new Error(`No meaning for part ${p} (used by ${k})`);
      const s = `radical-u${hex(p)}`;
      if (!newRadicals.has(p)) newRadicals.set(p, { level });
      prereq.push(s);
    }
  }
  // Keep links the old app already had (its own radicals); one link per part, so 雨 isn't both a radical and a kanji.
  const existing = bySlug.get(slug)?.prerequisites ?? [];
  const termOf = (s: string) => bySlug.get(s)?.term ?? [...newRadicals.keys()].find((p) => `radical-u${hex(p)}` === s);
  const taken = new Set(existing.map(termOf));
  const merged = [...new Set([...existing, ...prereq.filter((s) => !taken.has(termOf(s)))])];
  links.push({ slug, prerequisites: merged });
}

const radicals = [...newRadicals].map(([p, { level }]) => ({
  slug: `radical-u${hex(p)}`,
  type: "radical",
  jlpt_level: LEVELS[level],
  term: p,
  meaning: meanings[p],
  skill: "kanji",
  tags: ["radical"],
}));
const doc = { version: 1, kind: "items", source: "radicals-kradfile", records: radicals };
const parsed = parseImport(doc);
if (parsed.issues.length) throw new Error(parsed.issues.map((i) => `${i.slug}: ${i.message}`).join("\n"));
writeFileSync(join(CONTENT, "radicals", "radicals.json"), JSON.stringify(doc, null, 1) + "\n");
writeFileSync(join(CONTENT, "radicals", "kanji-links.json"), JSON.stringify({ note: "Kanji item → part slugs (prerequisites).", records: links }, null, 1) + "\n");
const linked = links.filter((l) => l.prerequisites.length).length;
console.log(`radicals.json: ${radicals.length} radicals (${LEVELS.map((l, i) => `${l} ${radicals.filter((r) => r.jlpt_level === LEVELS[i]).length}`).join(", ")})`);
console.log(`kanji-links.json: ${linked}/${links.length} kanji linked to their parts`);
