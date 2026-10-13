import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BUNDLED_PACKS } from "@/lib/content/packs";
import { parseImport } from "@/lib/content/schema";

const DIR = join(__dirname, "..", "content", "legacy");
const load = (file: string) => parseImport(JSON.parse(readFileSync(join(DIR, file), "utf8")));

describe("bundled legacy packs", () => {
  it.each(BUNDLED_PACKS.map((p) => p.file))("%s validates with no skipped records", (file) => {
    const parsed = load(file);
    expect(parsed.issues).toEqual([]);
    expect(parsed.records.length).toBeGreaterThan(0);
  });

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
