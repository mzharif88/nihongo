import { describe, expect, it } from "vitest";
import { settingsSchema } from "./settings";

const valid = { target_level: "N2", exam_date: "2027-07-04", goal: "both", timezone: "Asia/Kuala_Lumpur" };

describe("settingsSchema", () => {
  it("accepts a valid profile", () => {
    expect(settingsSchema.parse(valid)).toEqual(valid);
  });

  it("stores a blank exam date as null", () => {
    expect(settingsSchema.parse({ ...valid, exam_date: "" }).exam_date).toBeNull();
  });

  it("rejects unknown levels, malformed dates and timezones, and ignores extra fields like role", () => {
    expect(settingsSchema.safeParse({ ...valid, target_level: "N6" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...valid, exam_date: "July 2027" }).success).toBe(false);
    expect(settingsSchema.safeParse({ ...valid, timezone: "Mars/Olympus" }).success).toBe(false);
    expect(settingsSchema.parse({ ...valid, role: "admin" })).not.toHaveProperty("role");
  });
});
