import { describe, expect, it } from "vitest";
import type { StudyItem } from "@/lib/study/cards";
import { knownCard, passed, passedLevels, placementQuizzes, sampleLevel, spreadDays } from "./placement";

const word = (id: string, level: string, freq: number | null = null): StudyItem & { data: { freq: number | null } } => ({
  id,
  slug: id,
  type: "word",
  jlpt_level: level,
  term: id,
  reading: null,
  romaji: null,
  meaning: `meaning ${id}`,
  mnemonic: null,
  examples: [],
  tags: [],
  topic: null,
  prerequisites: [],
  audio_url: null,
  data: { freq },
});

describe("sampleLevel", () => {
  it("spreads the sample over the frequency range and skips started words", () => {
    const words = Array.from({ length: 120 }, (_, i) => word(`w${i}`, "N5", i + 1));
    const picked = sampleLevel(words, new Set(["w0"]), 12);
    expect(picked).toHaveLength(12);
    expect(picked.some((w) => w.id === "w0")).toBe(false);
    expect(Number(picked[0].id.slice(1))).toBeLessThan(10);
    expect(Number(picked[11].id.slice(1))).toBeGreaterThan(105);
  });
});

describe("placementQuizzes", () => {
  it("makes a quiz per level up to the target, never N1, skipping finished levels", () => {
    const items = [...["N5", "N4", "N3", "N2", "N1"].flatMap((l) => Array.from({ length: 20 }, (_, i) => word(`${l}-${i}`, l)))];
    const started = new Set(Array.from({ length: 20 }, (_, i) => `N4-${i}`));
    const quizzes = placementQuizzes(items, started, "N1", () => 0.3);
    expect(quizzes.map((q) => q.level)).toEqual(["N5", "N3", "N2"]);
    expect(quizzes[0].cards).toHaveLength(12);
    expect(quizzes[0].cards[0].options).toHaveLength(4);
  });
});

describe("passedLevels", () => {
  it("passes on 10 of 12 and stops at the first level failed", () => {
    expect(passed(10, 12)).toBe(true);
    expect(passed(9, 12)).toBe(false);
    expect(passed(5, 6)).toBe(true);
    expect(
      passedLevels([
        { level: "N5", correct: 12, total: 12 },
        { level: "N4", correct: 8, total: 12 },
        { level: "N3", correct: 12, total: 12 },
      ]),
    ).toEqual(["N5"]);
  });
});

describe("knownCard", () => {
  it("is a review card first due on the given day", () => {
    const now = new Date("2026-10-14T00:00:00Z");
    const card = knownCard(now, 30);
    expect(card.fsrs_state).toBe(2);
    expect(card.due).toBe("2026-11-13T00:00:00.000Z");
  });

  it("spreads first reviews evenly", () => {
    expect(spreadDays(3, 3, 90)).toEqual([3, 46.5, 90]);
    expect(spreadDays(0, 3, 90)).toEqual([]);
  });
});
