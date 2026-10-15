import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Every word's topic (content/topics/assignments.json, slug → topic name from
// content/topics/topics.json). The pack builds and `npm run build:topics`
// stamp it onto word records, so "Words by topic" covers every word.

export function loadTopicAssignments(): Map<string, string> {
  const file = join(process.cwd(), "content", "topics", "assignments.json");
  if (!existsSync(file)) return new Map();
  return new Map(Object.entries(JSON.parse(readFileSync(file, "utf8")) as Record<string, string>));
}

/** Set each word's topic from the assignments; other records pass through. */
export function applyWordTopics<T extends Record<string, unknown>>(records: T[], topics = loadTopicAssignments()): T[] {
  return records.map((r) => (r.type === "word" && topics.has(r.slug as string) ? { ...r, topic: topics.get(r.slug as string) } : r));
}
