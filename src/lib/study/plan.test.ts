import { describe, expect, it } from "vitest";
import { dailyPlan, practiceFor, type PracticeKind, type TodayDone } from "./plan";
import { studyPace } from "./pace";
import { startOfLocalDay } from "./streak";

const none: TodayDone = { reviews: 0, lessons: 0, situations: 0, reading: 0, builder: 0, listening: 0, mock: 0 };
const all = new Set<PracticeKind>(["reading", "builder", "situation", "listening", "mock"]);
const pace = studyPace({ targetLevel: "N2", examDate: "2027-07-04", today: "2026-10-14", started: 500 });

const plan = (over: Partial<Parameters<typeof dailyPlan>[0]> = {}) =>
  dailyPlan({ pace, totalDue: 12, introducedToday: 0, done: none, weekday: 1, nextLessonHref: "/lessons/x", available: all, ...over });

describe("dailyPlan", () => {
  it("lists reviews, new words, a lesson and the weekday's practice, with the countdown", () => {
    const p = plan();
    expect(p.daysLeft).toBe(263);
    expect(p.phase).toBe("learn");
    expect(p.tasks.map((t) => t.id)).toEqual(["reviews", "new", "lesson", "practice-reading"]);
    expect(p.doneCount).toBe(0);
  });

  it("ticks tasks off from today's activity", () => {
    const p = plan({ totalDue: 0, introducedToday: pace.newPerDay, done: { ...none, lessons: 1, reading: 1 } });
    expect(p.tasks.every((t) => t.done)).toBe(true);
    expect(p.doneCount).toBe(4);
  });

  it("switches to reviews and a daily mock in the last weeks", () => {
    const late = studyPace({ targetLevel: "N2", examDate: "2027-07-04", today: "2027-06-01", started: 7000 });
    const p = plan({ pace: late });
    expect(p.phase).toBe("review");
    expect(p.tasks.map((t) => t.id)).toEqual(["reviews", "practice-mock"]);
  });

  it("skips a lesson when every lesson is done", () => {
    expect(plan({ nextLessonHref: null }).tasks.some((t) => t.id === "lesson")).toBe(false);
  });
});

describe("practiceFor", () => {
  it("rotates through the skills, skipping ones with no content", () => {
    expect(practiceFor(6, all)).toBe("mock");
    expect(practiceFor(3, all)).toBe("listening");
    expect(practiceFor(3, new Set<PracticeKind>(["reading", "builder", "situation", "mock"]))).toBe("situation");
  });
});

describe("startOfLocalDay", () => {
  it("finds local midnight in UTC", () => {
    // 01:30 on 15 Oct in Kuala Lumpur (UTC+8) is 17:30 UTC on the 14th; midnight was 16:00 UTC.
    expect(startOfLocalDay(new Date("2026-10-14T17:30:00Z"), "Asia/Kuala_Lumpur").toISOString()).toBe("2026-10-14T16:00:00.000Z");
    expect(startOfLocalDay(new Date("2026-10-14T05:00:00Z"), "UTC").toISOString()).toBe("2026-10-14T00:00:00.000Z");
  });
});
