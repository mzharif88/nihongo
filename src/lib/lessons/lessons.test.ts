import { describe, expect, it } from "vitest";
import { LESSON_BONUS_XP, lessonXp, scoreChecks, summarizeLessons } from "./lessons";

const lesson = (id: string, jlpt_level: string, position: number) => ({
  id,
  slug: `lesson-${id}`,
  jlpt_level,
  position,
  title: id,
  situation: null,
  item_slugs: ["a", "b"],
});
const done = (lesson_id: string) => ({ lesson_id, score: 3, max_score: 3, attempts: 1, completed_at: "2026-10-13T00:00:00Z" });

describe("summarizeLessons", () => {
  it("orders by level then position and opens only the first unfinished lesson", () => {
    const lessons = [lesson("n4-1", "N4", 1), lesson("n5-2", "N5", 2), lesson("n5-1", "N5", 1)];
    expect(summarizeLessons(lessons, []).map((l) => [l.id, l.state])).toEqual([
      ["n5-1", "next"],
      ["n5-2", "locked"],
      ["n4-1", "locked"],
    ]);
  });

  it("keeps finished lessons open and moves 'next' along", () => {
    const lessons = [lesson("n5-1", "N5", 1), lesson("n5-2", "N5", 2), lesson("n5-3", "N5", 3)];
    const s = summarizeLessons(lessons, [done("n5-1")]);
    expect(s.map((l) => l.state)).toEqual(["done", "next", "locked"]);
    expect(s[0].progress?.score).toBe(3);
    expect(s[0].itemCount).toBe(2);
  });
});

describe("scoreChecks and lessonXp", () => {
  const checks = [
    { prompt: "a", options: ["x", "y"], answer: 0 },
    { prompt: "b", options: ["x", "y"], answer: 1 },
    { prompt: "c", options: ["x", "y"], answer: 1 },
  ];

  it("scores by option index and treats skipped checks as wrong", () => {
    expect(scoreChecks(checks, [0, 0, null])).toEqual({ score: 1, max: 3, correct: [true, false, false] });
  });

  it("gives check XP plus a first-time bonus", () => {
    const r = scoreChecks(checks, [0, 1, 1]);
    expect(lessonXp(r, false)).toBe(30);
    expect(lessonXp(r, true)).toBe(30 + LESSON_BONUS_XP);
  });
});
