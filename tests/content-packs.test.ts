import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PACK_GROUPS } from "@/lib/content/packs";
import { parseImport } from "@/lib/content/schema";

const CONTENT = join(__dirname, "..", "content");
const loadFrom = (group: string, file: string) =>
  parseImport(JSON.parse(readFileSync(join(CONTENT, group, file), "utf8")));
const load = (file: string) => loadFrom("legacy", file);

const allPacks = PACK_GROUPS.flatMap((g) => g.packs.map((p) => [g.id, p.file] as const));

describe("every bundled pack", () => {
  it.each(allPacks)("%s/%s validates with no skipped records", (group, file) => {
    const parsed = loadFrom(group, file);
    expect(parsed.issues).toEqual([]);
    expect(parsed.records.length).toBeGreaterThan(0);
  });
});

describe("open-data packs", () => {
  const FIXES = "00-legacy-level-fixes.json";
  const legacySlugs = new Set(load("01-items.json").records.map((r) => r.slug as string));
  const opendata = PACK_GROUPS.find((g) => g.id === "opendata")!.packs;

  it("only touch existing legacy items through the fixes pack", () => {
    for (const r of loadFrom("opendata", FIXES).records) expect(legacySlugs).toContain(r.slug);
    for (const { file } of opendata.filter((p) => p.file !== FIXES)) {
      for (const r of loadFrom("opendata", file).records) expect(legacySlugs, `${file}: ${r.slug}`).not.toContain(r.slug);
    }
  });

  it("never repeat a slug or an item across packs", () => {
    const records = opendata.flatMap((p) => loadFrom("opendata", p.file).records);
    expect(new Set(records.map((r) => r.slug)).size).toBe(records.length);
    expect(new Set(records.map((r) => `${r.type}:${r.term}:${r.reading}`)).size).toBe(records.length);
  });

  it("never carries WaniKani fields", () => {
    for (const { file } of opendata) {
      const raw = readFileSync(join(CONTENT, "opendata", file), "utf8");
      expect(raw, file).not.toMatch(/"wk_/);
    }
  });
});

describe("legacy packs", () => {
  it("only references slugs that exist", () => {
    const items = new Set(load("01-items.json").records.map((r) => r.slug as string));
    const mocks = new Set(load("03-mock-tests.json").records.map((r) => r.slug as string));
    for (const item of load("01-items.json").records) {
      for (const p of item.prerequisites as string[]) expect(items, `${item.slug} → ${p}`).toContain(p);
    }
    for (const q of load("04-questions.json").records) {
      if (q.mock_test_slug) expect(mocks).toContain(q.mock_test_slug);
      for (const s of q.item_slugs as string[]) expect(items, `${q.slug} → ${s}`).toContain(s);
    }
  });
});

describe("mnemonics overlay", () => {
  const mnemonics = JSON.parse(readFileSync(join(CONTENT, "mnemonics", "n5.json"), "utf8")) as Record<string, string>;
  const bySlug = new Map(allPacks.flatMap(([g, f]) => loadFrom(g, f).records).map((r) => [r.slug as string, r]));

  it("only names items that exist, and every one made it into its pack", () => {
    for (const [slug, text] of Object.entries(mnemonics)) {
      expect(text.trim(), slug).not.toBe("");
      expect(bySlug.get(slug)?.mnemonic, slug).toBe(text);
    }
  });
});

describe("lesson packs", () => {
  const itemSlugs = new Map<string, string>();
  for (const g of PACK_GROUPS.filter((g) => g.id !== "lessons")) {
    for (const p of g.packs) {
      const parsed = loadFrom(g.id, p.file);
      if (parsed.kind === "items") for (const r of parsed.records) itemSlugs.set(r.slug as string, r.type as string);
    }
  }
  const lessons = PACK_GROUPS.find((g) => g.id === "lessons")!.packs.flatMap((p) => loadFrom("lessons", p.file).records);

  it("only point at items and grammar that exist", () => {
    for (const l of lessons) {
      for (const s of l.item_slugs as string[]) expect(itemSlugs.has(s), `${l.slug} → ${s}`).toBe(true);
      if (l.grammar_slug) expect(itemSlugs.get(l.grammar_slug as string), `${l.slug} → ${l.grammar_slug}`).toBe("grammar");
    }
  });

  it("have unique positions per level and three checks each", () => {
    const keys = lessons.map((l) => `${l.jlpt_level}:${l.position}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const l of lessons) expect((l.checks as unknown[]).length, l.slug as string).toBe(3);
  });

  it("carry furigana for every dialogue line with kanji", () => {
    for (const l of lessons) {
      for (const line of l.dialogue as { jp: string; reading?: string }[]) {
        if (/[\u3400-\u9fff]/.test(line.jp)) expect(line.reading, line.jp).toMatch(/\[[^\]|]+\|[^\]]+\]/);
      }
    }
  });
});

describe("builder packs", () => {
  const patterns = PACK_GROUPS.find((g) => g.id === "builder")!.packs.flatMap((p) => loadFrom("builder", p.file).records);
  const grammar = new Set(
    load("01-items.json").records.filter((r) => r.type === "grammar").map((r) => r.slug as string),
  );
  const strip = (s: string) => s.replace(/\[([^\]|]+)\|[^\]]+\]/g, "$1");

  it("only update patterns that exist in the legacy pack, with real grammar points", () => {
    const legacy = new Set(load("02-sentence-patterns.json").records.map((r) => r.slug as string));
    for (const p of patterns) {
      expect(legacy, p.slug as string).toContain(p.slug);
      if (p.grammar_slug) expect(grammar, `${p.slug} → ${p.grammar_slug}`).toContain(p.grammar_slug);
    }
  });

  it("have tiles that spell each sentence exactly", () => {
    for (const p of patterns) {
      for (const ex of p.examples as { jp: string; tiles: string[]; reading?: string }[]) {
        expect(ex.tiles.map(strip).join("") + "。", `${p.slug}: ${ex.jp}`).toBe(ex.jp);
        if (ex.reading) expect(strip(ex.reading)).toBe(ex.jp);
      }
    }
  });

  it("never offer a decoy that could also be correct", () => {
    for (const p of patterns) {
      for (const ex of p.examples as { tiles: string[]; distractors: string[] }[]) {
        for (const d of ex.distractors) expect(ex.tiles.map(strip), `${p.slug}: ${d}`).not.toContain(strip(d));
      }
    }
  });
});

describe("kana duplicate merges", () => {
  const { merges } = JSON.parse(readFileSync(join(CONTENT, "merges", "kana-duplicates.json"), "utf8")) as {
    merges: { from: string; to: string; topic: string }[];
  };
  const all = PACK_GROUPS.filter((g) => g.id === "legacy" || g.id === "opendata").flatMap((g) =>
    g.packs.map((p) => loadFrom(g.id, p.file)).filter((p) => p.kind === "items").flatMap((p) => p.records),
  );
  const bySlug = new Map(all.map((r) => [r.slug as string, r]));

  it("drop every kana copy and give its topic to the kanji word", () => {
    for (const m of merges) {
      expect(bySlug.has(m.from), m.from).toBe(false);
      expect(bySlug.get(m.to)?.topic, m.to).toBe(m.topic);
    }
  });

  it("leave nothing pointing at a dropped word", () => {
    const gone = new Set(merges.map((m) => m.from));
    for (const r of all) for (const p of r.prerequisites as string[]) expect(gone.has(p), `${r.slug} → ${p}`).toBe(false);
  });
});
