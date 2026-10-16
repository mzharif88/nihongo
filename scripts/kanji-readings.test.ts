import { describe, expect, it } from "vitest";
import { commonReadings, markedKun, misreadings, segmentWord, splitWord } from "./kanji-readings";

const kanji = new Map([
  ["天", { on: ["てん"], kun: ["あまつ", "あめ", "あま"] }],
  ["気", { on: ["き", "け"], kun: [] }],
  ["見", { on: ["けん"], kun: ["みる", "みえる", "みせる"] }],
  ["意", { on: ["い"], kun: [] }],
  ["学", { on: ["がく"], kun: ["まなぶ"] }],
  ["校", { on: ["こう"], kun: [] }],
  ["人", { on: ["じん", "にん"], kun: ["ひと"] }],
  ["本", { on: ["ほん"], kun: ["もと"] }],
]);

describe("kanji readings from vocabulary", () => {
  it("splits a word into each kanji's reading, allowing sound changes and okurigana", () => {
    expect(splitWord("天気", "てんき", kanji)?.get("天")).toEqual(["てん", "てん"]);
    expect(splitWord("学校", "がっこう", kanji)?.get("学")).toEqual(["がく", "がく"]);
    expect(splitWord("人々", "ひとびと", kanji)?.get("人")).toEqual(["ひと", "ひと"]);
    expect(splitWord("見せる", "みせる", kanji)?.get("見")).toEqual(["み", "みせる"]);
    expect(splitWord("見本", "みほん", kanji)?.get("見")?.[0]).toBe("み");
    expect(splitWord("天気", "あいうえ", kanji)).toBeNull();
  });

  it("picks the reading the words use most, not the dictionary's first one", () => {
    const words = [
      { term: "天気", reading: "てんき", level: "N5" },
      { term: "見る", reading: "みる", level: "N5" },
      { term: "見せる", reading: "みせる", level: "N5" },
      { term: "意見", reading: "いけん", level: "N4" },
    ];
    const r = commonReadings(kanji, words);
    expect(r.get("天")).toBe("てん");
    expect(r.get("見")).toBe("みる");
    expect(r.get("校")).toBe("こう"); // no word uses it: first on reading
  });
});

describe("kanji card data", () => {
  const k = new Map([
    ...kanji,
    ["上", { on: ["じょう", "しょう"], kun: ["うえ", "うわ", "かみ", "あげる", "あがる"] }],
    ["手", { on: ["しゅ"], kun: ["て"] }],
    ["下", { on: ["か", "げ"], kun: ["した"] }],
  ]);

  it("pins override the data-driven key reading", () => {
    const words = [{ term: "上げる", reading: "あげる", level: "N5" }, { term: "差し上げる", reading: "さしあげる", level: "N4" }];
    expect(commonReadings(k, words).get("上")).toBe("あげる");
    expect(commonReadings(k, words, { 上: "うえ" }).get("上")).toBe("うえ");
  });

  it("marks okurigana on kun readings the words show", () => {
    const words = [{ term: "上げる", reading: "あげる", level: "N5" }, { term: "上", reading: "うえ", level: "N5" }];
    expect(markedKun("上", k.get("上")!, words, k)).toEqual(["うえ", "うわ", "かみ", "あ(げる)", "あがる"]);
  });

  it("offers JLPT-style misreadings: another reading, vowel length, っ, voicing", () => {
    expect(segmentWord("上手", "じょうず", k)).toBeNull(); // irregular: quizzes use words that split
    const seg = segmentWord("上下", "じょうげ", k)!;
    const wrong = misreadings(seg, "上", k.get("上")!, new Set(["じょう", "うえ", "あ"]));
    expect(wrong).toContain("うえげ");
    expect(wrong).toContain("じょげ");
    expect(wrong).not.toContain("じょうげ");
    expect(wrong.every((w) => /^[ぁ-ゖ]+$/.test(w))).toBe(true);
    // Before okurigana only kun readings are swapped in: no けんる for 見る.
    expect(misreadings(segmentWord("見る", "みる", k)!, "見", k.get("見")!)).not.toContain("けんる");
  });
});
