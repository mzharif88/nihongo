import { describe, expect, it } from "vitest";
import { compareLessons, lessonStates, lessonXp, scoreChecks, type LessonSummary } from "./lessons";

const lesson = (id: string, jlpt_level: string, position: number): LessonSummary => ({
  id,
  slug: `lesson-${id}`,
  jlpt_level,
  position,
  title: id,
  situation: null,
});

describe("compareLessons", () => {
  it("orders by level, then position", () => {
    const sorted = [lesson("b", "N4", 1), lesson("c", "N5", 2), lesson("a", "N5", 1)].sort(compareLessons);
    expect(sorted.map((l) => l.id)).toEqual(["a", "c", "b"]);
  });
});

describe("lessonStates", () => {
  const all = [lesson("n4-1", "N4", 1), lesson("n5-2", "N5", 2), lesson("n5-1", "N5", 1)];
  const states = (done: string[]) =>
    Object.fromEntries(lessonStates(all, new Set(done)).map((l) => [l.id, l.state]));

  it("opens only the first lesson for a new learner", () => {
    expect(states([])).toEqual({ "n5-1": "next", "n5-2": "locked", "n4-1": "locked" });
  });

  it("unlocks the following lesson once one is done", () => {
    expect(states(["n5-1"])).toEqual({ "n5-1": "done", "n5-2": "next", "n4-1": "locked" });
  });

  it("keeps a lesson open when a later one was finished out of order", () => {
    // e.g. an admin inserted a new lesson before ones already completed
    expect(states(["n5-2"])).toEqual({ "n5-1": "next", "n5-2": "done", "n4-1": "open" });
  });

  it("marks everything done when finished", () => {
    expect(Object.values(states(["n5-1", "n5-2", "n4-1"]))).toEqual(["done", "done", "done"]);
  });
});

describe("scoreChecks", () => {
  const checks = [
    { prompt: "a", options: ["x", "y"], answer: 0 },
    { prompt: "b", options: ["x", "y"], answer: 1 },
    { prompt: "c", options: ["x", "y", "z"], answer: 2 },
  ];

  it("counts matching picks", () => {
    expect(scoreChecks(checks, [0, 0, 2])).toEqual({ correct: 2, total: 3 });
  });

  it("treats missing or junk picks as wrong", () => {
    expect(scoreChecks(checks, [0])).toEqual({ correct: 1, total: 3 });
    expect(scoreChecks(checks, "nope")).toEqual({ correct: 0, total: 3 });
    expect(scoreChecks(checks, ["0", 1, 2])).toEqual({ correct: 2, total: 3 });
  });
});

describe("lessonXp", () => {
  it("gives the full award only the first time", () => {
    expect(lessonXp(true)).toBeGreaterThan(lessonXp(false));
  });
});
