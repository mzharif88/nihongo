import { describe, expect, it } from "vitest";
import { commonReadings, splitWord } from "./kanji-readings";

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
