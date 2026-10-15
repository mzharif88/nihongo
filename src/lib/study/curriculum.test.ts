import { describe, expect, it } from "vitest";
import { pickNewItems, type CurriculumItem } from "./curriculum";

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

  it("puts kana before kanji, words and sentences, and leaves radicals to their own topic", () => {
    const items = [
      item({ type: "sentence", jlpt_level: "N5", term: "s" }),
      item({ type: "word", jlpt_level: "N5", term: "w" }),
      item({ type: "kanji", jlpt_level: "N5", term: "k" }),
      item({ type: "radical", jlpt_level: "N5", term: "r" }),
      item({ type: "kana", term: "あ", tags: ["hiragana", "basic"] }),
    ];
    expect(pickNewItems(items, new Set(), new Set(), 10).map((i) => i.type)).toEqual([
      "kana", "kanji", "word", "sentence",
    ]);
  });

  it("doesn't hold kanji back for their radicals", () => {
    const sun = item({ type: "kanji", jlpt_level: "N5", term: "日", prerequisites: ["radical-sun"] });
    expect(pickNewItems([sun], new Set(), new Set(), 5)).toEqual([sun]);
  });

  it("skips items already started and grammar items, and respects the limit", () => {
    const a = item({ term: "あ", tags: ["hiragana", "basic"] });
    const i = item({ term: "い", tags: ["hiragana", "basic"] });
    const u = item({ term: "う", tags: ["hiragana", "basic"] });
    const g = item({ type: "grammar", jlpt_level: "N5", term: "は" });
    expect(pickNewItems([a, i, u, g], new Set([a.id]), new Set(), 1)).toEqual([i]);
    expect(pickNewItems([a], new Set(), new Set(), 0)).toEqual([]);
  });

  it("teaches common kanji first within a level", () => {
    const rare = item({ type: "kanji", jlpt_level: "N4", term: "一", data: { freq: 900 } });
    const common = item({ type: "kanji", jlpt_level: "N4", term: "二", data: { freq: 5 } });
    const unknown = item({ type: "kanji", jlpt_level: "N4", term: "三" });
    expect(pickNewItems([unknown, rare, common], new Set(), new Set(), 3)).toEqual([common, rare, unknown]);
  });

  it("orders words by topic, greetings first", () => {
    const food = item({ type: "word", jlpt_level: "N5", term: "a", topic: "Food & Drink" });
    const greet = item({ type: "word", jlpt_level: "N5", term: "b", topic: "Greetings & Basics" });
    const odd = item({ type: "word", jlpt_level: "N5", term: "c", topic: "Something new" });
    expect(pickNewItems([odd, food, greet], new Set(), new Set(), 3)).toEqual([greet, food, odd]);
  });
});
