import { describe, expect, it } from "vitest";
import type { StudyCard } from "./cards";
import { INTRO_BATCH, introGroup, shuffleFront } from "./intro";

const card = (key: string, isNew: boolean, introAlone = false) => ({ key, isNew, introAlone }) as StudyCard;

describe("introGroup", () => {
  it("introduces new items a few at a time", () => {
    const queue = ["a", "b", "c", "d", "e", "f"].map((k) => card(k, true));
    expect(introGroup(queue, new Set()).map((c) => c.key)).toEqual(["a", "b", "c", "d"].slice(0, INTRO_BATCH));
  });

  it("stops at reviews and at items already introduced", () => {
    expect(introGroup([card("r", false), card("a", true)], new Set())).toEqual([]);
    expect(introGroup([card("a", true), card("b", true)], new Set(["a"]))).toEqual([]);
    expect(introGroup([card("a", true), card("r", false), card("b", true)], new Set()).map((c) => c.key)).toEqual(["a"]);
  });

  it("keeps hiragana letters one at a time", () => {
    const queue = [card("あ", true, true), card("い", true, true), card("w", true)];
    expect(introGroup(queue, new Set()).map((c) => c.key)).toEqual(["あ"]);
    expect(introGroup([card("w", true), card("あ", true, true)], new Set()).map((c) => c.key)).toEqual(["w"]);
  });
});

describe("shuffleFront", () => {
  it("only reorders the introduced group", () => {
    const queue = ["a", "b", "c", "d", "e"].map((k) => card(k, true));
    const out = shuffleFront(queue, 3, () => 0);
    expect(out.slice(3).map((c) => c.key)).toEqual(["d", "e"]);
    expect(new Set(out.slice(0, 3).map((c) => c.key))).toEqual(new Set(["a", "b", "c"]));
  });
});
