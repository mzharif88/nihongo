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
