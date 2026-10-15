import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { OFFICIAL_PARTS } from "@/lib/mock/format";

// Full-length mocks match the official question count of every part.

const DIR = join(process.cwd(), "content", "mock");
const files = readdirSync(DIR).filter((f) => /-full-\d+\.source\.json$/.test(f));

describe("full-length mocks", () => {
  it("exist for every level", () => {
    for (const l of ["n5", "n4", "n3", "n2"]) expect(files.some((f) => f.startsWith(`${l}-full-`)), l).toBe(true);
  });
  for (const f of files) {
    it(`${f} has the official count in every part`, () => {
      const src = JSON.parse(readFileSync(join(DIR, f), "utf8"));
      const level = src.mock_test.jlpt_level as keyof typeof OFFICIAL_PARTS;
      const qs = src.questions as { section: string; part: string; options: string[]; answer: number }[];
      const got = OFFICIAL_PARTS[level].map((p) => ({
        part: p.part,
        count: qs.filter((q) => q.section === p.section && q.part.includes(p.part)).length,
      }));
      expect(got).toEqual(OFFICIAL_PARTS[level].map((p) => ({ part: p.part, count: p.count })));
      expect(qs.length).toBe(OFFICIAL_PARTS[level].reduce((n, p) => n + p.count, 0));
      for (const q of qs) {
        expect(new Set(q.options).size, q.part).toBe(q.options.length);
        expect(q.answer).toBeLessThan(q.options.length);
      }
    });
  }
});
