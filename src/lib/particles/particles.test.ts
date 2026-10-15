import { describe, expect, it } from "vitest";
import { hasKanji, isMarkup, stripMarkup } from "@/lib/furigana";
import { particleGroup, PARTICLE_GROUPS } from "./particles";

// Every kanji outside ruby markup: furigana is shown on all Japanese text.
const bareKanji = (s: string) => hasKanji(s.replace(/\[[^\]|]+\|[^\]]+\]/g, ""));

describe("particle cards", () => {
  it("have unique slugs and enough cards per particle", () => {
    expect(new Set(PARTICLE_GROUPS.map((g) => g.slug)).size).toBe(PARTICLE_GROUPS.length);
    for (const g of PARTICLE_GROUPS) expect(g.cards.length, g.slug).toBeGreaterThanOrEqual(8);
  });

  it("offer four distinct particle options including the answer", () => {
    for (const g of PARTICLE_GROUPS)
      for (const c of g.cards) {
        expect(new Set(c.options).size, `${g.slug}: ${stripMarkup(c.before)}`).toBe(4);
        expect(c.options, `${g.slug}: ${stripMarkup(c.before)}`).toContain(c.answer);
      }
  });

  it("put furigana on every kanji", () => {
    for (const g of PARTICLE_GROUPS) {
      for (const u of g.uses) expect(bareKanji(u.example), u.example).toBe(false);
      for (const c of g.cards) expect(bareKanji(c.before + c.after), c.before + c.after).toBe(false);
    }
    expect(isMarkup("[水|みず]")).toBe(true);
  });

  it("builds a mixed set from every group", () => {
    expect(particleGroup("mixed")!.cards.length).toBe(PARTICLE_GROUPS.reduce((n, g) => n + g.cards.length, 0));
    expect(particleGroup("nope")).toBeNull();
  });
});
