import { describe, expect, it } from "vitest";
import { checkpoints, readiness, type ReadinessInput } from "./readiness";

const none: ReadinessInput = {
  vocab: { done: 0, total: 700 },
  kanji: { done: 0, total: 100 },
  lessons: { done: 0, total: 15 },
  reading: { done: 0, total: 15, score: null },
  listening: { done: 0, total: 12, score: null },
  mock: null,
};
const all: ReadinessInput = {
  vocab: { done: 600, total: 700 },
  kanji: { done: 85, total: 100 },
  lessons: { done: 15, total: 15 },
  reading: { done: 10, total: 15, score: 0.8 },
  listening: { done: 8, total: 12, score: 0.75 },
  mock: { total: 120, maxTotal: 180, passTotal: 80, passed: true, finishedAt: "2026-10-01" },
};

describe("readiness", () => {
  it("starts at 0% and points a beginner at vocabulary", () => {
    const r = readiness("N5", none);
    expect(r.percent).toBe(0);
    expect(r.ready).toBe(false);
    expect(r.focus?.id).toBe("vocab");
  });

  it("is ready only when every area meets its target", () => {
    expect(readiness("N5", all)).toMatchObject({ ready: true, percent: 100, focus: null });
    const lowScores = readiness("N5", { ...all, listening: { done: 8, total: 12, score: 0.5 } });
    expect(lowScores.ready).toBe(false);
    expect(lowScores.focus?.id).toBe("listening");
  });

  it("wants a mock passed with a margin, in exam mode", () => {
    const close = readiness("N5", { ...all, mock: { ...all.mock!, total: 85 } });
    expect(close.areas.find((a) => a.id === "mock")!.met).toBe(false);
    expect(close.focus?.id).toBe("mock");
  });

  it("counts 80% of the words as the vocabulary target", () => {
    const r = readiness("N5", { ...none, vocab: { done: 560, total: 700 } });
    expect(r.areas[0]).toMatchObject({ met: true, progress: 1 });
  });
});

describe("checkpoints", () => {
  it("spaces levels by size up to the exam date, skipping levels already ready", () => {
    const plan = checkpoints("2026-10-16", "2027-07-04", "N2", { N5: false });
    expect(plan.map((p) => p.level)).toEqual(["N5", "N4", "N3", "N2"]);
    expect(plan[3].date).toBe("2027-07-04");
    expect(plan[0].date < plan[1].date && plan[1].date < plan[2].date).toBe(true);
    expect(checkpoints("2026-10-16", "2027-07-04", "N2", { N5: true }).map((p) => p.level)).toEqual(["N4", "N3", "N2"]);
    expect(checkpoints("2026-10-16", null, "N2", {})).toEqual([]);
  });
});
