import { readFileSync } from "node:fs";
import { join } from "node:path";

// Old-app topic words written in kana that duplicate an open-data word
// spelled in kanji (に → 二, ひとつ → 一つ). The kana copy is dropped from the
// legacy pack and its topic moves to the open-data word, so the topic tile
// and the level tile share one item and one progress.

export interface Merge {
  from: string;
  to: string;
  topic: string;
}

export function loadMerges(): Merge[] {
  const file = join(process.cwd(), "content", "merges", "kana-duplicates.json");
  return (JSON.parse(readFileSync(file, "utf8")) as { merges: Merge[] }).merges;
}

/** Drop merged-away records and any prerequisite pointing at them. */
export function dropMerged<T extends { slug: string; prerequisites?: unknown }>(records: T[], merges: Merge[]): T[] {
  const gone = new Set(merges.map((m) => m.from));
  return records
    .filter((r) => !gone.has(r.slug))
    .map((r) =>
      Array.isArray(r.prerequisites) ? { ...r, prerequisites: r.prerequisites.filter((p: string) => !gone.has(p)) } : r,
    );
}

/** Give each merge target the topic of the word it replaces. */
export function applyMergeTopics<T extends { slug: string; topic?: unknown }>(records: T[], merges: Merge[]): T[] {
  const topics = new Map(merges.map((m) => [m.to, m.topic]));
  return records.map((r) => (topics.has(r.slug) ? { ...r, topic: topics.get(r.slug) } : r));
}
