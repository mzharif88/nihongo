import { describe, expect, it } from "vitest";
import { studyPace, targetItems } from "./pace";

describe("studyPace", () => {
  it("spreads the target level's items over the days before the review buffer", () => {
    // N2 = 210 kana + 1000 kanji + 6000 words = 7210 items; 264 days left − 56 buffer = 208 learning days.
    const pace = studyPace({ targetLevel: "N2", examDate: "2027-07-04", today: "2026-10-13", started: 0 });
    expect(targetItems("N2")).toBe(7210);
    expect(pace.daysLeft).toBe(264);
    expect(pace.newPerDay).toBe(Math.ceil(7210 / 208));
    expect(pace.intensity).toBe("intense");
  });

  it("lowers the pace as items are started", () => {
    const fresh = studyPace({ targetLevel: "N2", examDate: "2027-07-04", today: "2026-10-13", started: 0 });
    const later = studyPace({ targetLevel: "N2", examDate: "2027-07-04", today: "2026-10-13", started: 3000 });
    expect(later.newPerDay).toBeLessThan(fresh.newPerDay);
  });

  it("flags a pace no one can sustain", () => {
    expect(studyPace({ targetLevel: "N1", examDate: "2027-01-01", today: "2026-10-13", started: 0 }).intensity).toBe(
      "unrealistic",
    );
  });

  it("uses the last weeks for review only: one learning day minimum, never negative", () => {
    const pace = studyPace({ targetLevel: "N5", examDate: "2026-11-01", today: "2026-10-13", started: 0 });
    expect(pace.newPerDay).toBe(1110);
  });

  it("falls back to a default without a date, after the exam, or stops when the target is met", () => {
    expect(studyPace({ targetLevel: "N5", examDate: null, today: "2026-10-13", started: 0 })).toMatchObject({
      newPerDay: 20,
      intensity: "no-date",
    });
    expect(studyPace({ targetLevel: "N5", examDate: "2026-07-05", today: "2026-10-13", started: 0 }).intensity).toBe("past");
    expect(studyPace({ targetLevel: "N5", examDate: "2027-07-04", today: "2026-10-13", started: 5000 }).newPerDay).toBe(0);
  });
});
