import { describe, expect, it } from "vitest";
import { applyKanjiHints, firstGloss, kanjiHint, partsOf, wordHint, type HintData } from "./kanji-hints";

const data: HintData = {
  parts: new Map(
    Object.entries({
      男: ["田", "力"],
      新: ["斤", "十", "辛", "木", "立"],
      辛: ["十", "辛", "立"],
      学: ["子", "⺌", "冖"],
      生: ["生"],
      右: ["ノ", "一", "口"],
    }),
  ),
  gloss: new Map(Object.entries({ 田: "rice field", 力: "power", 学: "study", 生: "life", 木: "tree", 辛: "spicy", 斤: "axe", 子: "child", 口: "mouth", 男: "man" })),
};

describe("kanji parts hints", () => {
  it("glosses parts with kanji meanings or radical names", () => {
    expect(kanjiHint("男", data)).toBe("田 rice field + 力 power");
    expect(kanjiHint("学", data)).toBe("子 child + ⺌ small + 冖 cover");
  });

  it("lets a listed part absorb the smaller parts it is made of, and drops bare strokes", () => {
    expect(partsOf("新", data)).toEqual(["斤", "辛", "木"]);
    expect(partsOf("右", data)).toEqual(["口"]);
    expect(kanjiHint("生", data)).toBeNull();
  });

  it("builds word hints from the word's kanji", () => {
    expect(wordHint("学生", data)).toBe("学 study + 生 life");
    expect(wordHint("男の子", data)).toBe("男 man + 子 child");
    expect(wordHint("男", data)).toBe("男 man: 田 rice field + 力 power");
    expect(wordHint("かばん", data)).toBeNull();
  });

  it("replaces sound-alike hints, drops kana-word hints, keeps kanji shape hints", () => {
    const out = applyKanjiHints(
      [
        { slug: "a", type: "word", term: "学生", mnemonic: '"gak-say" a student' },
        { slug: "b", type: "word", term: "かばん", mnemonic: "Bag" },
        { slug: "c", type: "kanji", term: "生", mnemonic: "A sprout pushing up from the ground" },
        { slug: "d", type: "kanji", term: "生", mnemonic: '"say" life' },
        { slug: "e", type: "kana", term: "あ", mnemonic: "Looks like an A" },
      ],
      data,
    );
    expect(out.map((r) => r.mnemonic)).toEqual([
      "学 study + 生 life",
      undefined,
      "A sprout pushing up from the ground",
      undefined,
      "Looks like an A",
    ]);
  });

  it("takes the first sense of a meaning list", () => {
    expect(firstGloss("power, strength, strong")).toBe("power");
    expect(firstGloss("Sun / Day")).toBe("sun");
  });
});
