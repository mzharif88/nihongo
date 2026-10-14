import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { KanjiScope } from "@/components/kanji-scope";
import { Ruby } from "@/components/ruby";
import { alsoMarkup } from "@/lib/builder/builder";
import { kanjiAbove } from "@/lib/kanji-levels";

// Every piece of level content, rendered as the app renders it inside its
// level's scope, must show no kanji above that level: like the JLPT, those
// appear in kana. Kanji questions' options (表記, 語形成) keep their kanji.

const CONTENT = join(process.cwd(), "content");
const SKIP = new Set(["slug", "item_slugs", "grammar_slug", "mock_test_slug", "text_slug", "en", "english", "meaning", "mnemonic", "romaji", "source", "tags", "data", "template", "explanation", "part", "notes", "kind", "section", "jp"]);

function strings(v: unknown, key = ""): string[] {
  if (SKIP.has(key)) return [];
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.flatMap((x) => strings(x));
  if (v && typeof v === "object") return Object.entries(v).flatMap(([k, x]) => strings(x, k));
  return [];
}

const shown = (text: string, level: string) =>
  renderToString(
    <KanjiScope level={level}>
      <Ruby text={text.replace(/\{\{|\}\}/g, "")} />
    </KanjiScope>,
  )
    .replace(/<rt>.*?<\/rt>/g, "")
    .replace(/<[^>]+>/g, "");

const packs = ["lessons", "builder", "mock", "reading", "listening"].flatMap((dir) =>
  readdirSync(join(CONTENT, dir))
    .filter((f) => f.endsWith(".json") && !f.includes("source") && !f.endsWith("-test.json"))
    .map((f) => ({ name: `${dir}/${f}`, records: JSON.parse(readFileSync(join(CONTENT, dir, f), "utf8")).records as Record<string, unknown>[] })),
);

describe("content shows only its level's kanji", () => {
  for (const p of packs) {
    it(p.name, () => {
      const problems: string[] = [];
      for (const r of p.records) {
        const level = (r.jlpt_level as string) ?? "N5";
        const keep = /表記|語形成/.test((r.part as string) ?? "");
        // Builder "also correct" orders render rebuilt from the tiles.
        const examples = Array.isArray(r.examples)
          ? (r.examples as { also?: string[]; tiles?: string[] }[]).map((e) => ({ ...e, also: (e.also ?? []).map((a) => alsoMarkup(a, e.tiles ?? [])) }))
          : r.examples;
        const texts = strings(keep ? { ...r, examples, options: [] } : { ...r, examples });
        for (const t of texts) {
          // Target words of kanji questions ({{…}}) keep their kanji on purpose.
          const above = kanjiAbove(shown(t.replace(/\{\{.*?\}\}/g, ""), level), level);
          if (above.length) problems.push(`${r.slug}: ${above.join("")} in "${t.slice(0, 40)}"`);
        }
      }
      expect(problems).toEqual([]);
    });
  }
});
