import { describe, expect, it } from "vitest";
import { mockPapers, predictScore } from "./format";

describe("mockPapers", () => {
  it("splits N5 into three papers timed at the official rate", () => {
    // The official N5 目安 since December 2020: 21 / 22 / 24 questions.
    const papers = mockPapers("N5", { vocabulary: 21, grammar: 17, reading: 5, listening: 24 });
    expect(papers.map((p) => [p.id, p.questions, p.minutes])).toEqual([
      ["vocab", 21, 20],
      ["grammar-reading", 22, 40],
      ["listening", 24, 30],
    ]);
  });

  it("scales time down for a shorter mock and skips empty papers", () => {
    expect(mockPapers("N5", { vocabulary: 14, grammar: 8, reading: 3 }).map((p) => p.minutes)).toEqual([13, 20]);
    expect(mockPapers("N2", { vocabulary: 4, grammar: 3, reading: 2, listening: 1 }).map((p) => p.id)).toEqual([
      "language-reading",
      "listening",
    ]);
    expect(mockPapers("preN5", { vocabulary: 3 })).toEqual([]);
  });
});

describe("predictScore", () => {
  it("scores N5 out of 120 + 60 with sectional minimums", () => {
    const p = predictScore("N5", {
      vocabulary: { correct: 15, total: 20 },
      grammar: { correct: 10, total: 15 },
      reading: { correct: 3, total: 5 },
      listening: { correct: 6, total: 12 },
    })!;
    expect(p.sections.map((s) => [s.score, s.passed])).toEqual([
      [84, true],
      [30, true],
    ]);
    expect([p.total, p.passTotal, p.passed]).toEqual([114, 80, true]);
  });

  it("fails on a sectional minimum even with a good total", () => {
    const p = predictScore("N5", {
      vocabulary: { correct: 20, total: 20 },
      grammar: { correct: 15, total: 15 },
      reading: { correct: 5, total: 5 },
      listening: { correct: 3, total: 12 },
    })!;
    expect(p.total).toBeGreaterThanOrEqual(80);
    expect(p.passed).toBe(false);
  });

  it("uses three sections at N3 and above", () => {
    const p = predictScore("N3", { vocabulary: { correct: 4, total: 4 }, grammar: { correct: 3, total: 3 }, reading: { correct: 1, total: 2 }, listening: { correct: 1, total: 1 } })!;
    expect(p.sections.map((s) => s.score)).toEqual([60, 30, 60]);
    expect(p.passed).toBe(true);
  });
});
