import { describe, expect, it } from "vitest";
import { STARTER } from "./starter";
import { openStage } from "./newcomer.server";
import { dueCount, grade, mastery, nightRecallOpen, nightRecallStart, overallMastery, recallQueue, type RecallPhrase } from "./recall";
import { acceptTranslations, kanaOf, splitLines } from "./translate";
import { nextScene, SCENES, sceneOpen, type Scene } from "./listening";

const NOW = new Date("2026-10-16T12:00:00Z");
const DAY = 86_400_000;

const phrase = (key: string, over: Partial<RecallPhrase> = {}): RecallPhrase => ({
  key,
  meaning: key,
  meaningLang: "en",
  jp: "はい。",
  reading: "はい。",
  kana: "はい。",
  priority: "normal",
  right: 0,
  wrong: 0,
  streak: 0,
  due: NOW.toISOString(),
  ...over,
});

describe("grade", () => {
  const fresh = { right: 0, wrong: 0, streak: 0, due: NOW.toISOString() };

  it("spaces correct answers out: 1, 2, 4 days", () => {
    const a = grade(fresh, true, "normal", NOW);
    const b = grade(a, true, "normal", NOW);
    const c = grade(b, true, "normal", NOW);
    expect([a, b, c].map((s) => (new Date(s.due).getTime() - NOW.getTime()) / DAY)).toEqual([1, 2, 4]);
    expect(c).toMatchObject({ right: 3, streak: 3 });
  });

  it("brings a miss back in ten minutes and resets the streak", () => {
    const s = grade({ ...fresh, right: 4, streak: 4 }, false, "normal", NOW);
    expect(s).toMatchObject({ right: 4, wrong: 1, streak: 0 });
    expect(new Date(s.due).getTime() - NOW.getTime()).toBe(10 * 60_000);
  });

  it("waits three times longer for 'less often' phrases", () => {
    expect((new Date(grade(fresh, true, "less", NOW).due).getTime() - NOW.getTime()) / DAY).toBe(3);
  });
});

describe("mastery", () => {
  it("is the share right, null before any answer", () => {
    expect(mastery(0, 0)).toBeNull();
    expect(mastery(3, 1)).toBe(75);
  });

  it("averages per phrase, so one drilled phrase doesn't dominate", () => {
    expect(overallMastery([{ right: 30, wrong: 0 }, { right: 0, wrong: 1 }, { right: 0, wrong: 0 }])).toBe(50);
  });
});

describe("recallQueue", () => {
  it("asks priority first, then most overdue, then new; never paused or not yet due", () => {
    const list = [
      phrase("new"),
      phrase("later", { right: 1, streak: 1, due: new Date(NOW.getTime() + DAY).toISOString() }),
      phrase("overdue", { right: 1, due: new Date(NOW.getTime() - 2 * DAY).toISOString() }),
      phrase("due", { right: 1, due: new Date(NOW.getTime() - DAY).toISOString() }),
      phrase("paused", { priority: "paused" }),
      phrase("top", { priority: "priority", right: 2, due: new Date(NOW.getTime() + DAY).toISOString() }),
    ];
    expect(recallQueue(list, NOW).map((p) => p.key)).toEqual(["top", "overdue", "due", "new"]);
    expect(dueCount(list, NOW)).toBe(4);
  });
});

describe("Night Recall", () => {
  const tz = "Asia/Kuala_Lumpur";

  it("opens at 21:30 Malaysia time and closes at 4am", () => {
    expect(nightRecallOpen(new Date("2026-10-16T13:29:00Z"), tz)).toBe(false); // 21:29
    expect(nightRecallOpen(new Date("2026-10-16T13:30:00Z"), tz)).toBe(true); // 21:30
    expect(nightRecallOpen(new Date("2026-10-16T19:59:00Z"), tz)).toBe(true); // 03:59
    expect(nightRecallOpen(new Date("2026-10-16T20:00:00Z"), tz)).toBe(false); // 04:00
  });

  it("starts tonight at 21:30, or last night after midnight", () => {
    expect(nightRecallStart(new Date("2026-10-16T14:00:00Z"), tz).toISOString()).toBe("2026-10-16T13:30:00.000Z");
    expect(nightRecallStart(new Date("2026-10-16T18:00:00Z"), tz).toISOString()).toBe("2026-10-16T13:30:00.000Z");
  });
});

describe("translations", () => {
  it("spells the reading out in kana, katakana kept", () => {
    expect(kanaOf("[日本語|にほんご]のアニメが[好|す]きです。")).toBe("にほんごのアニメがすきです。");
  });

  it("keeps well-formed lines and reports the rest", () => {
    const lines = ["I like coffee.", "Saya nak balik.", "broken"];
    const { kept, failed } = acceptTranslations(lines, {
      phrases: [
        { index: 0, lang: "en", meaning: "I like coffee.", jp: "コーヒーが好きです。", reading: "コーヒーが[好|す]きです。", words: ["コーヒー", " 好き ", "coffee", "好き"] },
        { index: 1, lang: "ms", meaning: "Saya nak balik.", jp: "帰ります。", reading: "[帰|かえ]ります。", words: ["帰る"] },
        // The reading doesn't spell the sentence: dropped.
        { index: 2, lang: "en", meaning: "Broken.", jp: "壊れました。", reading: "[壊|こわ]れます。", words: [] },
      ],
    });
    expect(kept.map((k) => k.kana)).toEqual(["コーヒーがすきです。", "かえります。"]);
    expect(kept[1].source_lang).toBe("ms");
    // Words are kept Japanese-only and unique, for matching the word list.
    expect(kept[0].words).toEqual(["コーヒー", "好き"]);
    expect(failed).toEqual(["broken"]);
  });

  it("splits a box into lines", () => {
    expect(splitLines(" a \n\n b\r\nc ")).toEqual(["a", "b", "c"]);
  });
});

describe("starter library", () => {
  it("has kana for every phrase and opens with short chunks", () => {
    expect(STARTER.length).toBeGreaterThanOrEqual(12);
    for (const t of STARTER) {
      for (const p of t.phrases) expect(p.kana, p.slug).not.toMatch(/[㐀-鿿]/);
      expect(Math.min(...t.phrases.map((p) => p.stage)), t.slug).toBeLessThanOrEqual(2);
    }
  });

  it("opens the next stage once 70% of the open phrases are right", () => {
    const topic = STARTER[0];
    const open = topic.phrases.filter((p) => p.stage <= 2);
    expect(openStage(topic, new Map())).toBe(2);
    const most = new Map(open.slice(0, Math.ceil(open.length * 0.7)).map((p) => [p.slug, { streak: 1 }]));
    expect(openStage(topic, most)).toBeGreaterThan(2);
    const few = new Map(open.slice(0, 1).map((p) => [p.slug, { streak: 1 }]));
    expect(openStage(topic, few)).toBe(2);
  });
});

describe("listening unlocks", () => {
  const scenes = [1, 2, 3].map((level) => ({ slug: `konbini-${level}`, topic: "konbini", level })) as unknown as Scene[];

  it("opens level 1 at once and each next level when the one below is done", () => {
    expect(sceneOpen(scenes[0], new Map(), scenes)).toBe(true);
    expect(sceneOpen(scenes[1], new Map(), scenes)).toBe(false);
    expect(sceneOpen(scenes[1], new Map([["konbini-1", { plays: 1, gist_correct: true }]]), scenes)).toBe(true);
    // Missing the gist still counts after three listens.
    expect(sceneOpen(scenes[1], new Map([["konbini-1", { plays: 2, gist_correct: false }]]), scenes)).toBe(false);
    expect(sceneOpen(scenes[1], new Map([["konbini-1", { plays: 3, gist_correct: false }]]), scenes)).toBe(true);
  });

  it("suggests the lowest open scene not yet done", () => {
    expect(nextScene(new Map(), scenes)?.slug).toBe("konbini-1");
    expect(nextScene(new Map([["konbini-1", { plays: 1, gist_correct: true }]]), scenes)?.slug).toBe("konbini-2");
  });
});

describe("listening scenes", () => {
  it("has 42 scenes with kana for every line and a valid gist answer", () => {
    expect(SCENES).toHaveLength(42);
    for (const s of SCENES) {
      for (const l of s.lines) expect(l.kana, s.slug).not.toMatch(/[㐀-鿿]/);
      expect(s.question.options[s.question.answer], s.slug).toBeDefined();
    }
  });
});
