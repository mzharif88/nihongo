import { describe, expect, it } from "vitest";
import { acceptSentences, costUsd, sentenceProblem } from "./sentences";

const ok = { jp: "毎日日本語を勉強します。", reading: "[毎日|まいにち][日本語|にほんご]を[勉強|べんきょう]します。", en: "I study Japanese every day." };

describe("sentenceProblem", () => {
  it("accepts a sentence with the word and matching furigana", () => {
    expect(sentenceProblem("勉強", ok)).toBeNull();
  });

  it("rejects missing words, mismatched or partial readings, and fragments", () => {
    expect(sentenceProblem("学校", ok)).toMatch(/contain/);
    expect(sentenceProblem("勉強", { ...ok, reading: "[毎日|まいにち]日本語を[勉強|べんきょう]します。" })).toMatch(/kanji without/);
    expect(sentenceProblem("勉強", { ...ok, reading: ok.reading.replace("します", "しました") })).toMatch(/match/);
    expect(sentenceProblem("勉強", { ...ok, reading: ok.reading.replace("べんきょう", "ベンキョウ") })).toMatch(/hiragana/);
    expect(sentenceProblem("勉強", { ...ok, jp: "勉強します", reading: "[勉強|べんきょう]します" })).toMatch(/sentence/);
  });
});

describe("acceptSentences", () => {
  it("keeps at most two good sentences per word and counts the rest", () => {
    const words = [{ slug: "w", term: "勉強", reading: "べんきょう", meaning: "study", level: "N5" }];
    const batch = {
      sentences: [
        { slug: "w", ...ok },
        { slug: "w", jp: "図書館で勉強しました。", reading: "[図書館|としょかん]で[勉強|べんきょう]しました。", en: "I studied at the library." },
        { slug: "w", jp: "勉強は楽しいです。", reading: "[勉強|べんきょう]は[楽|たの]しいです。", en: "Studying is fun." },
        { slug: "other", ...ok },
        { slug: "w", ...ok, reading: "bad" },
      ],
    };
    const { kept, discarded } = acceptSentences(words, batch);
    expect(kept).toHaveLength(2);
    expect(discarded).toBe(3);
  });
});

describe("costUsd", () => {
  it("prices tokens per model", () => {
    expect(costUsd("claude-opus-5-5", 1_000_000, 1_000_000)).toBe(24);
    expect(costUsd("claude-haiku-5-5", 2_000_000, 0)).toBeCloseTo(0.2);
  });
});
