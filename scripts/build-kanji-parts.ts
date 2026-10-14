/**
 * Vendor KRADFILE's kanji → component decompositions as JSON.
 *
 *   npm run build:kanji-parts -- <path to kradfile-u>
 *
 * kradfile-u: EDRDG KRADFILE (Unicode), CC BY-SA 4.0. Lines look like
 * "男 : 田 力". Only the decompositions are kept.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const file = process.argv[2];
if (!file) throw new Error("Usage: npm run build:kanji-parts -- <kradfile-u>");
const parts: Record<string, string[]> = {};
for (const line of readFileSync(file, "utf8").split("\n")) {
  if (!line || line.startsWith("#")) continue;
  const [kanji, rest] = line.split(" : ");
  if (kanji && rest) parts[kanji.trim()] = rest.trim().split(/\s+/);
}
const doc = {
  source: "KRADFILE (EDRDG), CC BY-SA 4.0 — https://www.edrdg.org/krad/kradinf.html",
  parts,
};
writeFileSync(join(process.cwd(), "content", "kanji-parts", "kradfile.json"), JSON.stringify(doc) + "\n");
console.log(`kradfile.json: ${Object.keys(parts).length} kanji`);
