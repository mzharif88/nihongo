import { describe, expect, it } from "vitest";
import { kanjiRank } from "@/lib/kanji-levels";
import { groupBySlug, groupsWith, KANJI_GROUPS } from "./groups";

describe("kanji groups", () => {
  it("only use N5–N2 kanji, with unique slugs and 2–6 kanji each", () => {
    expect(new Set(KANJI_GROUPS.map((g) => g.slug)).size).toBe(KANJI_GROUPS.length);
    for (const g of KANJI_GROUPS) {
      expect(g.kanji.length, g.slug).toBeGreaterThanOrEqual(2);
      expect(g.kanji.length, g.slug).toBeLessThanOrEqual(6);
      for (const k of g.kanji) expect(Number.isFinite(kanjiRank(k)), `${g.slug}: ${k}`).toBe(true);
    }
  });

  it("gives every look-alike a difference and a hint per kanji", () => {
    for (const g of KANJI_GROUPS.filter((x) => x.kind === "lookalike")) {
      expect(g.difference.length, g.slug).toBeGreaterThan(10);
      expect(Object.keys(g.hints).sort(), g.slug).toEqual([...g.kanji].sort());
    }
  });

  it("finds groups by slug and by kanji", () => {
    const g = KANJI_GROUPS[0];
    expect(groupBySlug(g.slug)).toBe(g);
    expect(groupsWith(g.kanji[0])).toContain(g);
  });
});
