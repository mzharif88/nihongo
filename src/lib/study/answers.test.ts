import { describe, expect, it } from "vitest";
import { acceptedKeys, answerKey, isTypedAnswerCorrect } from "./answers";

describe("answerKey", () => {
  it("matches romaji and kana spellings of the same reading", () => {
    expect(answerKey("konnichiwa")).toBe(answerKey("こんにちは"));
    expect(answerKey("ka")).toBe(answerKey("カ"));
    expect(answerKey("Tōkyō")).toBe(answerKey("toukyou"));
    expect(answerKey("ookii")).toBe(answerKey("おおきい"));
  });

  it("keeps different readings different", () => {
    expect(answerKey("ka")).not.toBe(answerKey("ga"));
    expect(answerKey("kya")).not.toBe(answerKey("kiya"));
  });
});

describe("isTypedAnswerCorrect", () => {
  it("accepts kana typed for a kana card", () => {
    expect(isTypedAnswerCorrect("あ", { term: "あ", romaji: "a" })).toBe(true);
    expect(isTypedAnswerCorrect("a", { term: "ア", romaji: "a" })).toBe(true);
    expect(isTypedAnswerCorrect("i", { term: "あ", romaji: "a" })).toBe(false);
  });

  it("accepts any of a kanji's slash-separated readings", () => {
    const sun = { term: "日", romaji: "nichi/hi" };
    expect(isTypedAnswerCorrect("hi", sun)).toBe(true);
    expect(isTypedAnswerCorrect("にち", sun)).toBe(true);
    expect(isTypedAnswerCorrect("tsuki", sun)).toBe(false);
  });

  it("accepts words by romaji or kana reading", () => {
    const hello = { term: "こんにちは", romaji: "konnichiwa" };
    expect(isTypedAnswerCorrect("konnichiha", hello)).toBe(true);
    expect(isTypedAnswerCorrect("こんにちは", hello)).toBe(true);
    expect(isTypedAnswerCorrect("", hello)).toBe(false);
  });

  it("dedupes accepted keys", () => {
    expect(acceptedKeys({ term: "あめ", romaji: "ame", reading: "あめ" })).toEqual(["ame"]);
  });
});
