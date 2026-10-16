/**
 * npm run build:dedupe: drop duplicate words (content/merges/duplicates.json)
 * from the item packs and the topic assignments, in place. build-open-data
 * drops them too, so a rebuild keeps them out.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface Duplicate {
  from: string;
  to: string;
  reason: string;
}

export const loadDuplicates = (): Duplicate[] => JSON.parse(readFileSync(join(process.cwd(), "content", "merges", "duplicates.json"), "utf8")).merges;

export function dropDuplicates<T extends { slug: string }>(records: T[], dupes = loadDuplicates()): T[] {
  const gone = new Set(dupes.map((d) => d.from));
  return records.filter((r) => !gone.has(r.slug));
}

function main() {
  const dupes = loadDuplicates();
  const gone = new Set(dupes.map((d) => d.from));
  let dropped = 0;
  for (const dir of ["legacy", "opendata"]) {
    for (const f of readdirSync(join(process.cwd(), "content", dir)).filter((f) => f.endsWith(".json") && !f.endsWith(".source.json"))) {
      const file = join(process.cwd(), "content", dir, f);
      const text = readFileSync(file, "utf8");
      const doc = JSON.parse(text);
      if (doc.kind !== "items") continue;
      const before = doc.records.length;
      doc.records = dropDuplicates(doc.records, dupes);
      if (doc.records.length === before) continue;
      dropped += before - doc.records.length;
      writeFileSync(file, JSON.stringify(doc, null, text.startsWith("{\n  ") ? 2 : 1) + "\n");
    }
  }
  const topicsFile = join(process.cwd(), "content", "topics", "assignments.json");
  const topics = JSON.parse(readFileSync(topicsFile, "utf8")) as Record<string, string>;
  for (const s of gone) delete topics[s];
  writeFileSync(topicsFile, JSON.stringify(topics, null, 1) + "\n");
  console.log(`${dropped} duplicate records dropped`);
}

if (process.argv[1]?.endsWith("dedupe.ts")) main();
