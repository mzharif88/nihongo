import { describe, expect, it } from "vitest";
import { alignReading, furiganaSegments, isMarkup, parseMarkup, stripMarkup, stripRoles, toMarkup } from "./furigana";

describe("alignReading", () => {
  it("puts each kanji run's reading over it and leaves okurigana bare", () => {
    expect(alignReading("食べる", "たべる")).toEqual([{ text: "食", ruby: "た" }, { text: "べる" }]);
    expect(alignReading("お弁当", "おべんとう")).toEqual([{ text: "お" }, { text: "弁当", ruby: "べんとう" }]);
    expect(alignReading("女の子", "おんなのこ")).toEqual([
      { text: "女", ruby: "おんな" },
      { text: "の" },
      { text: "子", ruby: "こ" },
    ]);
  });

  it("handles a whole-kanji word and katakana in the term", () => {
    expect(alignReading("一人", "ひとり")).toEqual([{ text: "一人", ruby: "ひとり" }]);
    expect(alignReading("～円", "～えん")).toEqual([{ text: "～" }, { text: "円", ruby: "えん" }]);
  });

  it("ignores notes in the reading and falls back to one reading when it can't align", () => {
    expect(alignReading("結婚", "けっこん (する)")).toEqual([{ text: "結婚", ruby: "けっこん" }]);
    expect(alignReading("足; 脚", "あし")).toEqual([{ text: "足; 脚", ruby: "あし" }]);
  });

  it("leaves kana-only words alone", () => {
    expect(alignReading("これ", "これ")).toEqual([{ text: "これ" }]);
  });
});

describe("markup", () => {
  it("parses, rebuilds and strips ruby markup", () => {
    const markup = "[今日|きょう]は[雨|あめ]です。";
    const segs = parseMarkup(markup);
    expect(segs).toEqual([
      { text: "今日", ruby: "きょう" },
      { text: "は" },
      { text: "雨", ruby: "あめ" },
      { text: "です。" },
    ]);
    expect(toMarkup(segs)).toBe(markup);
    expect(stripMarkup(markup)).toBe("今日は雨です。");
  });

  it("chooses markup, then an aligned reading, then plain text", () => {
    expect(furiganaSegments("[水|みず]")).toEqual([{ text: "水", ruby: "みず" }]);
    expect(furiganaSegments("今日は雨", "[今日|きょう]は[雨|あめ]")[0]).toEqual({ text: "今日", ruby: "きょう" });
    expect(furiganaSegments("水", "みず")).toEqual([{ text: "水", ruby: "みず" }]);
    expect(furiganaSegments("Water")).toEqual([{ text: "Water" }]);
  });
});

describe("grammar roles", () => {
  const tagged = "⟨s⟩[私|わたし]⟨/⟩⟨p⟩は⟨/⟩⟨o⟩りんご⟨/⟩⟨p⟩を⟨/⟩⟨v⟩[食|た]べます⟨/⟩。";

  it("parses role spans onto segments, furigana and all", () => {
    expect(parseMarkup(tagged)).toEqual([
      { text: "私", ruby: "わたし", role: "s" },
      { text: "は", role: "p" },
      { text: "りんご", role: "o" },
      { text: "を", role: "p" },
      { text: "食", ruby: "た", role: "v" },
      { text: "べます", role: "v" },
      { text: "。" },
    ]);
  });

  it("round-trips through toMarkup and strips to plain text", () => {
    expect(toMarkup(parseMarkup(tagged))).toBe(tagged);
    expect(stripMarkup(tagged)).toBe("私はりんごを食べます。");
    expect(stripRoles(tagged)).toBe("[私|わたし]はりんごを[食|た]べます。");
  });

  it("counts role-only text as markup", () => {
    expect(isMarkup("⟨s⟩これ⟨/⟩⟨p⟩は⟨/⟩")).toBe(true);
    expect(furiganaSegments("これはペンです", "⟨s⟩これ⟨/⟩⟨p⟩は⟨/⟩ペン⟨v⟩です⟨/⟩")[0]).toEqual({ text: "これ", role: "s" });
  });
});
