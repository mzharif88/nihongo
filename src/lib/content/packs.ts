import { join } from "node:path";

/** Import files shipped in the repo, under `content/`, in dependency order. */
export const BUNDLED_DIR = join(process.cwd(), "content");

export const BUNDLED_PACKS = [
  { file: "legacy/01-items.json", label: "Old NihonGo! items: kana, radicals, kanji, words, sentences, grammar" },
  { file: "legacy/02-sentence-patterns.json", label: "Old NihonGo! sentence patterns" },
  { file: "legacy/03-mock-tests.json", label: "Old NihonGo! mini mock tests (import before questions)" },
  { file: "legacy/04-questions.json", label: "Old NihonGo! mock + grammar practice questions" },
  { file: "lessons/01-n5-starter-lessons.json", label: "N5 starter lessons 1–6 (uses the old items above)" },
] as const;
