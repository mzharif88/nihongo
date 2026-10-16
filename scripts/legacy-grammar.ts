/**
 * npm run build:legacy-grammar: give the old app's grammar points their
 * curated example sentences (content/legacy/grammar-examples.json), in
 * place. port-legacy applies the same file, so a re-port keeps them.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Example = { jp: string; en: string; reading?: string };

export function loadGrammarExamples(): Record<string, Example[]> {
  return JSON.parse(readFileSync(join(process.cwd(), "content", "legacy", "grammar-examples.json"), "utf8")).examples;
}

/** Replace the examples of listed grammar points; everything else passes through. */
export function applyGrammarExamples<T extends Record<string, unknown>>(records: T[], examples = loadGrammarExamples()): T[] {
  return records.map((r) => (r.type === "grammar" && examples[r.slug as string] ? { ...r, examples: examples[r.slug as string] } : r));
}

function main() {
  const file = join(process.cwd(), "content", "legacy", "01-items.json");
  const text = readFileSync(file, "utf8");
  const doc = JSON.parse(text);
  const examples = loadGrammarExamples();
  doc.records = applyGrammarExamples(doc.records, examples);
  writeFileSync(file, JSON.stringify(doc, null, text.startsWith("{\n  ") ? 2 : 1) + "\n");
  console.log(`${Object.keys(examples).length} grammar points given their examples`);
}

if (process.argv[1]?.endsWith("legacy-grammar.ts")) main();
