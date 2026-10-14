import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Every item pack on disk, and a lookup from a word's spelling (or a slug)
// to its slug, so hand-written content can say "友達" instead of a slug.

export const ITEM_DIRS = ["legacy", "opendata", "grammar"];

export type PackItem = { slug: string; type: string; term: string; jlpt_level: string } & Record<string, unknown>;

export function loadItems(): PackItem[] {
  const items: PackItem[] = [];
  for (const dir of ITEM_DIRS) {
    const path = join(process.cwd(), "content", dir);
    if (!existsSync(path)) continue;
    for (const f of readdirSync(path).filter((f) => f.endsWith(".json") && !f.endsWith(".source.json"))) {
      const doc = JSON.parse(readFileSync(join(path, f), "utf8"));
      if (doc.kind === "items") items.push(...doc.records);
    }
  }
  return items;
}

/** Slugs pass through; word spellings resolve to the lowest-level word with that spelling. */
export function itemResolver(items: PackItem[]) {
  const rank = ["preN5", "N5", "N4", "N3", "N2", "N1"];
  const bySlug = new Set(items.map((i) => i.slug));
  const byTerm = new Map<string, PackItem>();
  for (const i of items) {
    if (i.type !== "word") continue;
    const seen = byTerm.get(i.term);
    if (!seen || rank.indexOf(i.jlpt_level) < rank.indexOf(seen.jlpt_level)) byTerm.set(i.term, i);
  }
  return (ref: string, where: string): string => {
    if (bySlug.has(ref)) return ref;
    const hit = byTerm.get(ref);
    if (!hit) throw new Error(`${where}: no item for "${ref}"`);
    return hit.slug;
  };
}
