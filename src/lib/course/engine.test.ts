import { describe, expect, it } from "vitest";
import { adapt, courseLevels, levelProgress, planUnits, type CourseItem, type LearnerState } from "./engine";
import { blankOut, findSentence, unitCards } from "./unit";

const item = (slug: string, type: string, term: string, level = "N5", extra: Partial<CourseItem> = {}): CourseItem & {
  reading: string | null;
  romaji: null;
  mnemonic: null;
  examples: [];
  audio_url: null;
} => ({
  id: slug,
  slug,
  type,
  jlpt_level: level,
  term,
  topic: null,
  tags: [],
  prerequisites: [],
  data: null,
  meaning: `${term} meaning`,
  reading: null,
  romaji: null,
  mnemonic: null,
  examples: [],
  audio_url: null,
  ...extra,
});

const items = [
  item("kanji-hi", "kanji", "日", "N5", { data: { freq: 1 } }),
  item("kanji-hon", "kanji", "本", "N5", { data: { freq: 2 } }),
  item("kanji-ji", "kanji", "時", "N5", { data: { freq: 3 } }),
  item("word-nihon", "word", "日本"),
  item("word-mainichi", "word", "毎日"),
  item("word-hon", "word", "本"),
  item("word-honya", "word", "本屋"),
  item("word-jikan", "word", "時間"),
  item("word-kyou", "word", "きょう"),
  item("kanji-ken", "kanji", "研", "N3", { data: { freq: 9 } }),
  item("word-kenkyuu", "word", "研究", "N3"),
  item("word-n1", "word", "斡旋", "N1"),
];

const fresh = (over: Partial<LearnerState> = {}): LearnerState => ({
  started: new Set(),
  learnedSlugs: new Set(),
  recentGrades: [],
  dueCount: 0,
  struggling: [],
  ...over,
});

describe("courseLevels", () => {
  it("runs from N5 to the target, capped at N2 for now", () => {
    expect(courseLevels("N5")).toEqual(["N5"]);
    expect(courseLevels("N3")).toEqual(["N5", "N4", "N3"]);
    expect(courseLevels("N1")).toEqual(["N5", "N4", "N3", "N2"]);
    expect(courseLevels("preN5")).toEqual(["N5"]);
  });
});

describe("adapt", () => {
  it("shrinks units when accuracy drops or reviews pile up, grows them when it's high", () => {
    expect(adapt({ recentGrades: [], dueCount: 0 }).size).toBe(8);
    expect(adapt({ recentGrades: Array(20).fill(1).concat(Array(20).fill(3)), dueCount: 0 }).size).toBe(5);
    expect(adapt({ recentGrades: Array(40).fill(3), dueCount: 0 }).size).toBe(10);
    expect(adapt({ recentGrades: Array(40).fill(3), dueCount: 200 }).size).toBe(5);
  });
});

describe("planUnits", () => {
  it("teaches a kanji before the words that use it, only words readable with what's known", () => {
    const [unit] = planUnits(items, "N5", fresh(), { size: 8, count: 1 });
    const slugs = unit.items.map((i) => i.slug);
    expect(slugs.slice(0, 2)).toEqual(["kanji-hi", "kanji-hon"]);
    expect(slugs).toContain("word-nihon"); // 日 + 本, both in the unit
    expect(slugs).not.toContain("word-mainichi"); // 毎 isn't known
    expect(slugs.indexOf("word-nihon")).toBeGreaterThan(slugs.indexOf("kanji-hon"));
    expect(unit.title).toContain("日");
  });

  it("never puts radicals in a unit, even when a kanji lists them as parts", () => {
    const withRadical = [item("radical-sun", "radical", "日"), ...items.map((i) => (i.slug === "kanji-hi" ? { ...i, prerequisites: ["radical-sun"] } : i))];
    const units = planUnits(withRadical, "N5", fresh(), { size: 8, count: 3 });
    expect(units.flatMap((u) => u.items).some((i) => i.type === "radical")).toBe(false);
    expect(units[0].items[0].slug).toBe("kanji-hi");
    expect(levelProgress(withRadical, ["N5"], fresh())[0].total).toBe(9);
  });

  it("stays within the target level and plans units that follow on from each other", () => {
    const units = planUnits(items, "N5", fresh(), { size: 4, count: 5 });
    const all = units.flatMap((u) => u.items.map((i) => i.jlpt_level));
    expect(new Set(all)).toEqual(new Set(["N5"]));
    const seen = units.flatMap((u) => u.items.map((i) => i.id));
    expect(new Set(seen).size).toBe(seen.length);
  });

  it("never goes past N2, even for an N1 target", () => {
    const done = new Set(items.filter((i) => i.jlpt_level === "N5").map((i) => i.id));
    const units = planUnits(items, "N1", fresh({ started: done, learnedSlugs: new Set([...done]) }), { count: 5 });
    expect(units.flatMap((u) => u.items).some((i) => i.jlpt_level === "N1")).toBe(false);
  });

  it("brings struggling words back as refreshers, preferring ones that share a kanji", () => {
    const started = new Set(["kanji-hi", "word-kyou", "word-mainichi"]);
    const units = planUnits(items, "N5", fresh({ started, learnedSlugs: new Set(started), struggling: [{ itemId: "word-kyou", weight: 4 }, { itemId: "word-mainichi", weight: 2 }] }), { size: 4, count: 1 });
    expect(units[0].refresh.map((i) => i.slug)).toEqual(["word-mainichi", "word-kyou"]);
  });

  it("reports level progress", () => {
    const started = new Set(["kanji-hi", "word-nihon"]);
    const [n5] = levelProgress(items, ["N5"], { started, learnedSlugs: new Set(["kanji-hi"]) });
    expect(n5).toEqual({ level: "N5", total: 9, started: 2, learned: 1 });
  });
});

describe("unit cards", () => {
  const corpus = [
    { jp: "日本の本屋に行きました。", en: "I went to a Japanese bookshop.", reading: "[日本|にほん]の[本屋|ほんや]に[行|い]きました。" },
    { jp: "本を読みます。", en: "I read a book.", reading: "[本|ほん]を[読|よ]みます。" },
  ];

  it("prefers sentences that combine several of the unit's words", () => {
    expect(findSentence("本屋", corpus, ["日本", "本屋"])?.en).toBe("I went to a Japanese bookshop.");
    expect(findSentence("時間", corpus, ["時間"])).toBeNull();
  });

  it("blanks the word but keeps furigana on the rest", () => {
    expect(blankOut(corpus[0], "本屋")).toBe("[日本|にほん]の（　）に[行|い]きました。");
  });

  it("introduces every new item, adds practice context cards, then refreshers", () => {
    const unit = [items[0], items[1], items[3], items[6]];
    const cards = unitCards(unit, [items[8]], items, corpus, () => 0.5);
    expect(cards.filter((c) => c.isNew).map((c) => c.itemId)).toEqual(unit.map((i) => i.id));
    const context = cards.filter((c) => c.practice);
    expect(context.length).toBeGreaterThan(0);
    for (const c of context) expect(c.options?.[c.answerIndex!]).toBeDefined();
    expect(cards.at(-1)?.itemId).toBe("word-kyou");
  });
});
