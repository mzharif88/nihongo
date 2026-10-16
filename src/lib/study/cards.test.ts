import { describe, expect, it } from "vitest";
import { buildCard, pickOptions, scriptOf, shuffle, type StudyItem } from "./cards";

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

  it("asks for the word that means something, answered in kana, never kanji", () => {
    const words = [
      item({ type: "word", term: "水", reading: "みず", meaning: "Water", tags: [] }),
      item({ type: "word", term: "火", reading: "ひ", meaning: "Fire", tags: [] }),
      item({ type: "word", term: "すし", reading: "すし", meaning: "Sushi", tags: [] }),
      item({ type: "word", term: "勉強", reading: "べんきょう (する)", meaning: "Study", tags: [] }),
    ];
    const card = buildCard(words[0], "recall", false, words, seeded(2));
    expect(card.prompt).toBe("Water");
    expect(card.options![card.answerIndex!]).toBe("みず");
    expect(card.options).toEqual(expect.arrayContaining(["ひ", "すし", "べんきょう"]));
    expect(card.options!.some((o) => /[㐀-鿿]/.test(o))).toBe(false);
  });

  it("shows furigana on prompts except where the reading is the answer", () => {
    const water = item({ type: "word", term: "水", reading: "みず", meaning: "Water", tags: [] });
    expect(buildCard(water, "recognition", false, [water]).promptReading).toBe("みず");
    const sun = item({ type: "kanji", term: "日", reading: "ひ", meaning: "Sun", tags: [] });
    expect(buildCard(sun, "recognition", false, [sun]).promptReading).toBe("ひ");
    expect(buildCard(sun, "recall", false, [sun]).promptReading).toBeNull();
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

describe("options in the answer's script", () => {
  it("tells hiragana, katakana and kanji apart, ignoring furigana", () => {
    expect(scriptOf("たべる")).toBe("hiragana");
    expect(scriptOf("テレビ")).toBe("katakana");
    expect(scriptOf("コーヒー")).toBe("katakana");
    expect(scriptOf("[食|た]べる")).toBe("kanji");
    expect(scriptOf("〜ふん")).toBe("hiragana");
    expect(scriptOf("to eat")).toBe("other");
  });

  it("picks wrong options in the same script, topping up only if short", () => {
    expect(pickOptions("ひ", ["ニチ", "つき", "ジツ", "やま", "かわ"], 3)).toEqual(["つき", "やま", "かわ"]);
    expect(pickOptions("テレビ", ["ラジオ", "[本|ほん]", "パン", "えき"], 2)).toEqual(["ラジオ", "パン"]);
    expect(pickOptions("ひ", ["つき", "ニチ"], 3)).toEqual(["つき", "ニチ"]);
    expect(pickOptions("ひ", ["ひ", "つき", "つき"], 3)).toEqual(["つき"]);
  });

  it("gives a kana word kana options and a katakana word katakana ones", () => {
    const word = (term: string, reading: string) => item({ type: "word", jlpt_level: "N5", term, reading, romaji: null, meaning: term, tags: [] });
    const pool = [word("テレビ", "てれび"), word("ラジオ", "らじお"), word("パン", "ぱん"), word("カメラ", "かめら"), word("ここ", "ここ"), word("そこ", "そこ"), word("あそこ", "あそこ"), word("どこ", "どこ"), word("本", "ほん"), word("駅", "えき"), word("山", "やま"), word("川", "かわ")];
    for (const target of pool) {
      const card = buildCard(target, "recall", false, pool, seeded(7));
      const want = scriptOf(card.options![card.answerIndex!]);
      expect(card.options!.map(scriptOf), target.term).toEqual(card.options!.map(() => want));
    }
  });
});

describe("kanji reading quiz", () => {
  const kanjiItem = (term: string, examples: unknown[] = []) =>
    item({ type: "kanji", jlpt_level: "N5", term, reading: "うえ", romaji: null, meaning: "up", tags: [], data: { on: ["じょう"], kun: ["うえ"], kun_marked: ["うえ", "あ(げる)"], examples } as never });

  it("asks how a word with the kanji is read, with its misreadings as options, all in hiragana", () => {
    const up = kanjiItem("上", [{ term: "上手", reading: "じょうず", meaning: "skilful", level: "N5", uses: "じょう", misreadings: ["うえず", "じょず", "しょうず"] }]);
    const card = buildCard(up, "recall", false, [up], seeded(3));
    expect(card.question).toBe("How is this word read?");
    expect(card.prompt).toBe("上手");
    expect(card.promptReading).toBeNull();
    expect(card.options![card.answerIndex!]).toBe("じょうず");
    expect([...card.options!].sort()).toEqual(["うえず", "しょうず", "じょうず", "じょず"]);
    expect(card.reveal.quizWord).toEqual({ term: "上手", reading: "じょうず", meaning: "skilful" });
  });

  it("shows 音 in katakana and 訓 with okurigana on the card", () => {
    const up = kanjiItem("上");
    expect(buildCard(up, "recognition", true, [up]).reveal.readings).toEqual({ on: ["ジョウ"], kun: ["うえ", "あ(げる)"] });
  });
});
