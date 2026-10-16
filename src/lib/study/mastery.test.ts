import { describe, expect, it } from "vitest";
import type { StudyCard } from "./cards";
import { learnerStage, recentAccuracy, withOptionCount } from "./mastery";

const grades = (right: number, wrong: number) => [...Array(right).fill(3), ...Array(wrong).fill(1)];

describe("learner stage", () => {
  it("starts everyone as a beginner: 3 choices, 3 new at a time", () => {
    expect(learnerStage(0, [])).toMatchObject({ id: "beginner", options: 3, introBatch: 3 });
  });

  it("moves up with items learned and accuracy, and back down in a slump", () => {
    expect(learnerStage(120, grades(50, 10)).id).toBe("developing");
    expect(learnerStage(600, grades(57, 3)).id).toBe("confident");
    expect(learnerStage(600, grades(50, 10)).id).toBe("developing");
    expect(learnerStage(120, grades(30, 30)).id).toBe("beginner");
    expect(learnerStage(120, grades(30, 30)).next).toContain("75%");
  });

  it("needs ten reviews before accuracy counts", () => {
    expect(recentAccuracy(grades(5, 0))).toBeNull();
    expect(recentAccuracy(grades(9, 1))).toBe(0.9);
  });
});

describe("withOptionCount", () => {
  const card = { options: ["a", "b", "c", "d"], answerIndex: 3 } as StudyCard;
  it("keeps the answer and drops wrong options", () => {
    const out = withOptionCount(card, 3);
    expect(out.options).toHaveLength(3);
    expect(out.options![out.answerIndex!]).toBe("d");
    expect(withOptionCount(card, 4)).toBe(card);
  });
});
