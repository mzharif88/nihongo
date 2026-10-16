import { describe, expect, it } from "vitest";
import { regressions, runAudit, RULES, type Content } from "@/lib/audit/engine";
import { loadBaseline, loadContent } from "../scripts/content-audit";

// The content audit runs with every test run: errors fail it, and so does any
// warning count above content/audit/baseline.json, so quality only goes up.

describe("content audit", () => {
  const report = runAudit(loadContent());

  it("finds no errors", () => {
    const errors = report.rules.filter((r) => r.severity === "error" && r.count > 0);
    expect(errors.map((r) => `${r.id}: ${r.samples.slice(0, 3).map((s) => `${s.slug ?? s.file} ${s.message}`).join("; ")}`)).toEqual([]);
  });

  it("adds no warnings beyond the baseline", () => {
    expect(regressions(report, loadBaseline()).map((r) => `${r.id}: ${r.count}`)).toEqual([]);
  });
});

describe("audit rules", () => {
  const content = (over: Partial<Content>): Content => ({ packs: [], items: new Map(), topics: new Set(["Food & Drink"]), fullMocks: [], ...over });
  const run = (c: Content, id: string) => RULES.find((r) => r.id === id)!.check(c);

  it("catches a kanji word without a kana reading, and accepts one with", () => {
    const items = new Map([
      ["a", { slug: "a", type: "word", term: "水", reading: "みず", jlpt_level: "N5", meaning: "water", topic: "Food & Drink" }],
      ["b", { slug: "b", type: "word", term: "火", reading: "hi", jlpt_level: "N5", meaning: "fire", topic: "Food & Drink" }],
    ]);
    expect(run(content({ items }), "word-reading").map((f) => f.slug)).toEqual(["b"]);
  });

  it("keeps Newcomer lines in polite form", () => {
    const line = (slug: string, jp: string) => ({ file: "newcomer/listening.json", slug, jp, reading: jp, grade: 1, kind: "scene" as const });
    const newcomer = [
      line("ok", "お先に失礼します。"),
      line("set", "おはようございます。"),
      line("ask", "お名前は？"),
      line("offer", "お茶をどうぞ。"),
      line("casual", "また明日。"),
      line("te", "はい、おなかを壊してしまって。"),
    ];
    expect(run(content({ newcomer }), "newcomer-polite").map((f) => f.slug)).toEqual(["casual", "te"]);
  });

  it("catches a question whose answer key is out of range or whose options repeat", () => {
    const packs = [{ file: "q.json", kind: "questions", records: [
      { slug: "ok", options: ["あ", "い", "う"], answer: 2 },
      { slug: "key", options: ["あ", "い"], answer: 2 },
      { slug: "dupe", options: ["あ", "あ", "う"], answer: 0 },
    ] }];
    expect(run(content({ packs }), "question-answer").map((f) => f.slug)).toEqual(["key", "dupe"]);
  });

  it("catches furigana that disagree with the dictionary, but not okurigana or counters", () => {
    const items = new Map([
      ["w", { slug: "w", type: "word", term: "目撃者", reading: "もくげきしゃ", jlpt_level: "N2", meaning: "witness", topic: "Food & Drink" }],
      ["p", { slug: "p", type: "word", term: "支払", reading: "しはらい", jlpt_level: "N3", meaning: "payment", topic: "Food & Drink" }],
    ]);
    const packs = [{ file: "l.json", kind: "lessons", records: [{ slug: "l", jlpt_level: "N2", dialogue: [
      { jp: "目撃者が来た。", reading: "[目撃者|もくげきもの]が[来|き]た。" },
      { jp: "支払いです。", reading: "[支払|しはら]いです。" },
    ] }] }];
    expect(run(content({ items, packs }), "furigana-dictionary").map((f) => f.message.split(" (")[0])).toEqual(["[目撃者|もくげきもの]"]);
  });

  it("flags 即時応答 with four options, as the JLPT gives three", () => {
    const packs = [{ file: "m.json", kind: "questions", records: [{ slug: "m", mock_test_slug: "x", part: "問題4 即時応答", options: ["あ", "い", "う", "え"], answer: 0 }] }];
    expect(run(content({ packs }), "question-option-count")).toHaveLength(1);
  });
});
