import { describe, expect, it } from "vitest";
import { buildCard, shuffle, type StudyItem } from "./cards";

function seeded(seed = 1) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

let n = 0;
const item = (p: Partial<StudyItem>): StudyItem => ({
  id: `id-${++n}`,
  slug: `s-${n}`,
  type: "kana",
  jlpt_level: "preN5",
  term: "あ",
  reading: null,
  romaji: "a",
  meaning: "a (vowel)",
  mnemonic: null,
  examples: [],
  tags: ["hiragana", "basic"],
  topic: null,
  prerequisites: [],
  audio_url: null,
  ...p,
});

const hira = ["あ:a", "い:i", "う:u", "え:e", "お:o"].map((x) => {
  const [term, romaji] = x.split(":");
  return item({ term, romaji, meaning: romaji });
});
const kata = item({ term: "ア", romaji: "a", tags: ["katakana", "basic"] });

describe("buildCard recognition", () => {
  it("asks for a kana's sound with 4 options from the same script, exactly one correct", () => {
    const card = buildCard(hira[0], "recognition", true, [...hira, kata], seeded());
    expect(card.mode).toBe("choice");
    expect(card.prompt).toBe("あ");
    expect(card.options).toHaveLength(4);
    expect(card.options![card.answerIndex!]).toBe("a");
    expect(new Set(card.options).size).toBe(4);
  });

  it("asks for a word's meaning, using other words' meanings as distractors", () => {
    const words = ["dog", "cat", "bird", "fish"].map((m) => item({ type: "word", meaning: m, term: m, tags: [] }));
    const card = buildCard(words[0], "recognition", false, [...words, ...hira], seeded(3));
    expect(card.question).toMatch(/mean/);
    expect(card.options!.sort()).toEqual(["bird", "cat", "dog", "fish"]);
  });

  it("never offers a duplicate of the right answer", () => {
    const twins = [item({ type: "word", meaning: "Hello" }), item({ type: "word", meaning: "hello" })];
    const card = buildCard(twins[0], "recognition", false, twins, seeded());
    expect(card.options).toEqual(["Hello"]);
  });
});

describe("buildCard recall", () => {
  it("asks for the kana of a sound, offering other kana from the same script", () => {
    const card = buildCard(hira[0], "recall", false, [...hira, kata], seeded());
    expect(card).toMatchObject({ mode: "choice", prompt: "a", promptIsJapanese: false, question: "Which kana makes this sound?" });
    expect(card.options![card.answerIndex!]).toBe("あ");
    expect(card.options).not.toContain("ア");
    expect(card.options).toHaveLength(4);
  });

  it("asks for the word that means something, showing kana readings for kanji words", () => {
    const words = [
      item({ type: "word", term: "水", reading: "みず", meaning: "Water", tags: [] }),
      item({ type: "word", term: "火", reading: "ひ", meaning: "Fire", tags: [] }),
      item({ type: "word", term: "すし", reading: "すし", meaning: "Sushi", tags: [] }),
    ];
    const card = buildCard(words[0], "recall", false, words, seeded(2));
    expect(card.prompt).toBe("Water");
    expect(card.options![card.answerIndex!]).toBe("水（みず）");
    expect(card.options).toContain("すし");
  });

  it("asks for a kanji's reading", () => {
    const sun = item({ type: "kanji", term: "日", reading: "ひ", romaji: "hi/nichi", meaning: "Sun", tags: [] });
    const moon = item({ type: "kanji", term: "月", reading: "つき", romaji: "tsuki", meaning: "Moon", tags: [] });
    const card = buildCard(sun, "recall", false, [sun, moon], seeded());
    expect(card).toMatchObject({ prompt: "日", question: "How is this kanji read?" });
    expect(card.options!.sort()).toEqual(["つき", "ひ"]);
  });

  it("never asks the learner to type or rate themselves", () => {
    for (const t of ["recognition", "recall"] as const) expect(buildCard(hira[1], t, false, hira).mode).toBe("choice");
  });
});

describe("shuffle", () => {
  it("keeps every element", () => {
    expect(shuffle([1, 2, 3, 4, 5], seeded(7)).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
