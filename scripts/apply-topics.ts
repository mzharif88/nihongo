/**
 * npm run build:topics: stamp content/topics/assignments.json onto every word
 * in the item packs (legacy and open data), in place. Only `topic` changes.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { applyWordTopics, loadTopicAssignments } from "./word-topics";

const topics = loadTopicAssignments();
const names = new Set((JSON.parse(readFileSync(join(process.cwd(), "content", "topics", "topics.json"), "utf8")) as { topics: { name: string }[] }).topics.map((t) => t.name));
const bad = [...topics].filter(([, t]) => !names.has(t));
if (bad.length) throw new Error(`Unknown topics: ${bad.slice(0, 5).map(([s, t]) => `${s} → ${t}`).join(", ")}`);

let words = 0;
let missing = 0;
for (const dir of ["legacy", "opendata"]) {
  const path = join(process.cwd(), "content", dir);
  for (const f of readdirSync(path).filter((f) => f.endsWith(".json") && !f.endsWith(".source.json"))) {
    const file = join(path, f);
    const text = readFileSync(file, "utf8");
    const doc = JSON.parse(text);
    if (doc.kind !== "items") continue;
    doc.records = applyWordTopics(doc.records, topics);
    for (const r of doc.records) {
      if (r.type !== "word") continue;
      if (topics.has(r.slug)) words++;
      else missing++;
    }
    // Keep each file's own indentation so diffs stay small.
    const indent = text.startsWith("{\n  ") ? 2 : 1;
    writeFileSync(file, JSON.stringify(doc, null, indent) + "\n");
  }
}
console.log(`${words} word records topped; ${missing} without an assignment`);
