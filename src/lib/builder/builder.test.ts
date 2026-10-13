import { describe, expect, it } from "vitest";
import { builderXp, BUILDER_BONUS_XP, dealTiles, isCorrect, playable, scoreBuilder, type BuilderExercise } from "./builder";

const ex: BuilderExercise = {
  jp: "七時に家に帰ります。",
  en: "I go home at seven.",
  tiles: ["[七時|しちじ]", "に", "[家|いえ]", "に", "[帰|かえ]ります"],
  distractors: ["で"],
  also: ["家に七時に帰ります"],
};

describe("isCorrect", () => {
  it("compares plain text, so duplicate tiles are interchangeable", () => {
    expect(isCorrect(ex, ["[七時|しちじ]", "に", "[家|いえ]", "に", "[帰|かえ]ります"])).toBe(true);
    expect(isCorrect(ex, ["七時", "に", "家", "に", "帰ります"])).toBe(true);
  });

  it("accepts the listed alternative orders and nothing else", () => {
    expect(isCorrect(ex, ["家", "に", "七時", "に", "帰ります"])).toBe(true);
    expect(isCorrect(ex, ["七時", "で", "家", "に", "帰ります"])).toBe(false);
    expect(isCorrect(ex, ["七時", "に", "家", "に"])).toBe(false);
  });
});

describe("dealTiles", () => {
  it("deals every tile and decoy once, never pre-solved", () => {
    const first = () => 0; // a shuffle that keeps the order would deal the answer
    for (const rng of [first, Math.random]) {
      const dealt = dealTiles(ex, rng);
      expect(dealt.map((t) => t.id).sort()).toEqual([0, 1, 2, 3, 4, 5]);
      expect(isCorrect(ex, dealt.slice(0, 5).map((t) => t.text))).toBe(false);
    }
  });
});

describe("scoring", () => {
  it("scores each exercise and treats missing answers as wrong", () => {
    const r = scoreBuilder([ex, ex], [["家", "に", "七時", "に", "帰ります"]]);
    expect(r).toEqual({ score: 1, max: 2, correct: [true, false] });
    expect(builderXp(r.correct, true)).toBe(10 + 2 + BUILDER_BONUS_XP);
  });

  it("skips exercises without tiles", () => {
    expect(playable([ex, { jp: "x", en: "x", tiles: [], distractors: [], also: [] }])).toHaveLength(1);
  });
});
