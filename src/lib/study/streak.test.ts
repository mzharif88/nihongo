import { describe, expect, it } from "vitest";
import { advanceStreak, localDate } from "./streak";

const base = { streak: 4, longest_streak: 6, freezes: 1, last_study_date: "2026-10-12" };

describe("localDate", () => {
  it("uses the learner's timezone, not UTC", () => {
    // 20:30 UTC on the 12th is already the 13th in Kuala Lumpur (UTC+8).
    expect(localDate(new Date("2026-10-12T20:30:00Z"), "Asia/Kuala_Lumpur")).toBe("2026-10-13");
    expect(localDate(new Date("2026-10-12T20:30:00Z"), "UTC")).toBe("2026-10-12");
  });
});

describe("advanceStreak", () => {
  it("does nothing on a second session the same day", () => {
    expect(advanceStreak(base, "2026-10-12")).toBe(base);
  });

  it("extends the streak on the next day", () => {
    expect(advanceStreak(base, "2026-10-13")).toEqual({ ...base, streak: 5, last_study_date: "2026-10-13" });
  });

  it("spends a freeze to bridge exactly one missed day", () => {
    expect(advanceStreak(base, "2026-10-14")).toEqual({ ...base, streak: 5, freezes: 0, last_study_date: "2026-10-14" });
  });

  it("restarts after a longer gap, or a one-day gap with no freeze", () => {
    expect(advanceStreak(base, "2026-10-16").streak).toBe(1);
    expect(advanceStreak({ ...base, freezes: 0 }, "2026-10-14").streak).toBe(1);
  });

  it("starts at 1 on the first ever session and tracks the longest streak", () => {
    expect(advanceStreak({ streak: 0, longest_streak: 0, freezes: 0, last_study_date: null }, "2026-10-13")).toEqual({
      streak: 1,
      longest_streak: 1,
      freezes: 0,
      last_study_date: "2026-10-13",
    });
    expect(advanceStreak({ ...base, streak: 6 }, "2026-10-13").longest_streak).toBe(7);
  });
});
