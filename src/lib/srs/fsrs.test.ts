import { describe, expect, it } from "vitest";
import { dueQueue, fromRow, gradeFromResult, newCard, Rating, review, toRow, type Grade } from "./fsrs";

const T0 = new Date("2026-10-13T00:00:00Z");
const DAY = 86_400_000;

describe("row mapping", () => {
  it("round-trips a card through the user_items row shape", () => {
    const row = review(newCard(T0), Rating.Good, T0);
    expect(toRow(fromRow(row))).toEqual(row);
  });

  it("starts new cards due immediately in the New state", () => {
    const row = newCard(T0);
    expect(row.fsrs_state).toBe(0);
    expect(new Date(row.due).getTime()).toBe(T0.getTime());
    expect(row.reps).toBe(0);
  });
});

describe("scheduling", () => {
  it("schedules Easy further out than Good, and Good further than Hard", () => {
    const start = newCard(T0);
    const due = (g: Grade) => new Date(review(start, g, T0).due).getTime();
    expect(due(Rating.Easy)).toBeGreaterThan(due(Rating.Good));
    expect(due(Rating.Good)).toBeGreaterThanOrEqual(due(Rating.Hard));
  });

  it("grows the interval with each successful review", () => {
    let row = newCard(T0);
    let now = T0;
    const intervals: number[] = [];
    for (let i = 0; i < 5; i++) {
      row = review(row, Rating.Good, now);
      const next = new Date(row.due);
      intervals.push(next.getTime() - now.getTime());
      now = next;
    }
    expect(row.fsrs_state).toBe(2); // Review
    expect(intervals.at(-1)!).toBeGreaterThan(intervals[2]);
    expect(intervals.at(-1)!).toBeGreaterThan(7 * DAY);
  });

  it("counts a lapse and moves to Relearning when a review card is forgotten", () => {
    let row = newCard(T0);
    let now = T0;
    for (let i = 0; i < 4; i++) {
      row = review(row, Rating.Good, now);
      now = new Date(row.due);
    }
    const before = row;
    const after = review(before, Rating.Again, now);
    expect(after.lapses).toBe(before.lapses + 1);
    expect(after.fsrs_state).toBe(3); // Relearning
    expect(after.stability).toBeLessThan(before.stability);
  });
});

describe("gradeFromResult", () => {
  it("maps wrong to Again, slow-correct to Hard, correct to Good", () => {
    expect(gradeFromResult(false)).toBe(Rating.Again);
    expect(gradeFromResult(true, 20_000)).toBe(Rating.Hard);
    expect(gradeFromResult(true, 3_000)).toBe(Rating.Good);
  });
});

describe("dueQueue", () => {
  const card = (offsetDays: number) => ({ id: offsetDays, due: new Date(T0.getTime() + offsetDays * DAY).toISOString() });

  it("returns only due cards, most overdue first", () => {
    const q = dueQueue([card(1), card(-3), card(0), card(-1)], T0);
    expect(q.map((c) => c.id)).toEqual([-3, -1, 0]);
  });

  it("caps the queue to the 15-minute budget", () => {
    const many = Array.from({ length: 500 }, (_, i) => card(-i - 1));
    expect(dueQueue(many, T0, 8_000)).toHaveLength(112); // 900s / 8s
    expect(dueQueue(many, T0, 30_000)).toHaveLength(30);
  });
});
