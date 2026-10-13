import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Original mnemonics written for this app live in content/mnemonics/*.json as
// { "<item slug>": "<mnemonic>" }. Both pack generators fill them in, so they
// survive every regeneration and import.

const DIR = join(process.cwd(), "content", "mnemonics");

export function loadMnemonics(): Map<string, string> {
  const map = new Map<string, string>();
  for (const file of readdirSync(DIR).filter((f) => f.endsWith(".json")).sort()) {
    for (const [slug, text] of Object.entries(JSON.parse(readFileSync(join(DIR, file), "utf8")) as Record<string, string>)) {
      if (map.has(slug)) throw new Error(`${file}: duplicate mnemonic for ${slug}`);
      map.set(slug, text);
    }
  }
  return map;
}

/** Fill in missing mnemonics; an item that already has one keeps it. */
export function applyMnemonics<T extends Record<string, unknown> & { slug: string }>(records: T[], map: Map<string, string>): T[] {
  return records.map((r) => (!r.mnemonic && map.has(r.slug) ? { ...r, mnemonic: map.get(r.slug) } : r));
}
