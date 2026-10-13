import { describe, expect, it } from "vitest";
import { newItemsPerDay, pickNewItems, type CurriculumItem } from "./curriculum";

let n = 0;
const item = (p: Partial<CurriculumItem>): CurriculumItem => ({
  id: `id-${++n}`,
  slug: `slug-${n}`,
  type: "kana",
  jlpt_level: "preN5",
  term: "あ",
  topic: null,
  tags: [],
  prerequisites: [],
  ...p,
});

describe("pickNewItems", () => {
  it("teaches basic hiragana in gojūon order before dakuten, combos and katakana", () => {
    const items = [
      item({ term: "ア", tags: ["katakana", "basic"] }),
      item({ term: "きゃ", tags: ["hiragana", "combo"] }),
      item({ term: "が", tags: ["hiragana", "dakuten"] }),
      item({ term: "か", tags: ["hiragana", "basic"] }),
      item({ term: "あ", tags: ["hiragana", "basic"] }),
    ];
    expect(pickNewItems(items, new Set(), new Set(), 10).map((i) => i.term)).toEqual(["あ", "か", "が", "きゃ", "ア"]);
  });

  it("puts kana before radicals, kanji, words and sentences", () => {
    const items = [
      item({ type: "sentence", jlpt_level: "N5", term: "s" }),
      item({ type: "word", jlpt_level: "N5", term: "w" }),
      item({ type: "kanji", jlpt_level: "N5", term: "k" }),
      item({ type: "radical", jlpt_level: "N5", term: "r" }),
      item({ type: "kana", term: "あ", tags: ["hiragana", "basic"] }),
    ];
    expect(pickNewItems(items, new Set(), new Set(), 10).map((i) => i.type)).toEqual([
      "kana", "radical", "kanji", "word", "sentence",
    ]);
  });

  it("holds kanji back until their radicals are learned", () => {
    const sun = item({ type: "kanji", jlpt_level: "N5", term: "日", prerequisites: ["radical-sun"] });
    expect(pickNewItems([sun], new Set(), new Set(), 5)).toEqual([]);
    expect(pickNewItems([sun], new Set(), new Set(["radical-sun"]), 5)).toEqual([sun]);
  });

  it("skips items already started and grammar items, and respects the limit", () => {
    const a = item({ term: "あ", tags: ["hiragana", "basic"] });
    const i = item({ term: "い", tags: ["hiragana", "basic"] });
    const u = item({ term: "う", tags: ["hiragana", "basic"] });
    const g = item({ type: "grammar", jlpt_level: "N5", term: "は" });
    expect(pickNewItems([a, i, u, g], new Set([a.id]), new Set(), 1)).toEqual([i]);
    expect(pickNewItems([a], new Set(), new Set(), 0)).toEqual([]);
  });

  it("orders words by topic, greetings first", () => {
    const food = item({ type: "word", jlpt_level: "N5", term: "a", topic: "Food & Drink" });
    const greet = item({ type: "word", jlpt_level: "N5", term: "b", topic: "Greetings & Basics" });
    const odd = item({ type: "word", jlpt_level: "N5", term: "c", topic: "Something new" });
    expect(pickNewItems([odd, food, greet], new Set(), new Set(), 3)).toEqual([greet, food, odd]);
  });
});

describe("newItemsPerDay", () => {
  it("scales with daily minutes within sane bounds", () => {
    expect(newItemsPerDay(20)).toBe(10);
    expect(newItemsPerDay(5)).toBe(3);
    expect(newItemsPerDay(180)).toBe(30);
  });
});
