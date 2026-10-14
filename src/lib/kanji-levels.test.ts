import { describe, expect, it } from "vitest";
import { allowanceFor, higherLevel, kanjiAbove, kanjiAllowed } from "./kanji-levels";

describe("kanji levels", () => {
  it("lists kanji the level's exam wouldn't print", () => {
    expect(kanjiAbove("日本語を勉強します", "N5")).toEqual(["勉", "強"]);
    expect(kanjiAbove("日本語を勉強します", "N4")).toEqual([]);
    expect(kanjiAbove("大丈夫", "N2")).toEqual(["丈"]);
  });

  it("allows a level's kanji, lower levels' and known extras", () => {
    expect(kanjiAllowed("赤", allowanceFor("N5"))).toBe(false);
    expect(kanjiAllowed("赤", allowanceFor("N5", "赤"))).toBe(true);
    expect(kanjiAllowed("赤", allowanceFor("N4"))).toBe(true);
    expect(kanjiAllowed("綺麗", allowanceFor("N2"))).toBe(false);
    expect(kanjiAllowed("綺麗", null)).toBe(true);
  });

  it("picks the higher level", () => {
    expect(higherLevel("N5", "N3")).toBe("N3");
    expect(higherLevel("N2", "N4")).toBe("N2");
  });
});
