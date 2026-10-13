import { describe, expect, it } from "vitest";
import type { CurriculumItem } from "./curriculum";
import { listTopics, pickTopicItems, TOPIC_ID } from "./topics";

let n = 0;
const item = (p: Partial<CurriculumItem>): CurriculumItem => ({
  id: `id-${++n}`,
  slug: `slug-${n}`,
  type: "word",
  jlpt_level: "N5",
  term: `t${n}`,
  topic: null,
  tags: [],
  prerequisites: [],
  ...p,
});

const a = item({ type: "kana", jlpt_level: "preN5", term: "あ", tags: ["hiragana", "basic"] });
const ka = item({ type: "kana", jlpt_level: "preN5", term: "ア", tags: ["katakana", "basic"] });
const sunRadical = item({ type: "radical", slug: "radical-sun", term: "日" });
const sun = item({ type: "kanji", term: "日", prerequisites: ["radical-sun"] });
const moon = item({ type: "kanji", term: "月" });
const water = item({ term: "水", topic: "Food & Drink" });
const n4word = item({ jlpt_level: "N4", term: "w4" });
const all = [a, ka, sunRadical, sun, moon, water, n4word];

describe("listTopics", () => {
  it("lists only topics that have content, with unstarted counts", () => {
    const topics = listTopics(all, new Set([a.id]));
    const byId = Object.fromEntries(topics.map((t) => [t.id, t.remaining]));
    expect(byId).toMatchObject({ "kana:hiragana": 0, "kana:katakana": 1, "kanji:N5": 2, "words:N5": 1, "words:N4": 1, "topic:Food & Drink": 1 });
    expect(byId).not.toHaveProperty("kanji:N1");
  });

  it("produces ids the database check accepts", () => {
    for (const t of listTopics(all, new Set())) expect(t.id).toMatch(TOPIC_ID);
  });
});

describe("pickTopicItems", () => {
  it("only picks items from the chosen topic", () => {
    expect(pickTopicItems(all, "kana:katakana", new Set(), new Set(), 10)).toEqual([ka]);
    expect(pickTopicItems(all, "topic:Food & Drink", new Set(), new Set(), 10)).toEqual([water]);
  });

  it("brings in a kanji's missing radical first, then the kanji once the radical is learned", () => {
    expect(pickTopicItems(all, "kanji:N5", new Set(), new Set(), 10)).toEqual([sunRadical, moon]);
    expect(pickTopicItems(all, "kanji:N5", new Set([sunRadical.id]), new Set(["radical-sun"]), 10)).toEqual([sun, moon]);
  });

  it("respects the limit and skips started items", () => {
    expect(pickTopicItems(all, "kanji:N5", new Set([moon.id]), new Set(["radical-sun"]), 1)).toEqual([sun]);
    expect(pickTopicItems(all, "words:N5", new Set(), new Set(), 0)).toEqual([]);
  });
});
