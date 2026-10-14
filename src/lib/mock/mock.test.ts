import { describe, expect, it } from "vitest";
import { buildPapers, scoreMock, spokenScript, type QuestionRow } from "./mock";

const q = (id: string, section: QuestionRow["section"], position: number, part: string = section): QuestionRow => ({
  id,
  slug: id,
  position,
  section,
  part,
  passage: null,
  prompt: "?",
  options: ["a", "b"],
  answer: 1,
  explanation: null,
  item_slugs: [],
});

describe("buildPapers", () => {
  it("orders questions into JLPT papers", () => {
    const papers = buildPapers("N5", [q("l1", "listening", 9), q("g1", "grammar", 5), q("v1", "vocabulary", 1), q("r1", "reading", 7)]);
    expect(papers.map((p) => [p.id, p.questions.map((x) => x.id)])).toEqual([
      ["vocab", ["v1"]],
      ["grammar-reading", ["g1", "r1"]],
      ["listening", ["l1"]],
    ]);
  });
});

describe("scoreMock", () => {
  it("tallies parts, collects wrong and blank answers, and predicts", () => {
    const qs = [q("v1", "vocabulary", 1, "P1"), q("v2", "vocabulary", 2, "P1"), q("l1", "listening", 3)];
    const r = scoreMock("N5", qs, { v1: 1, v2: 0 });
    expect([r.correct, r.total, r.wrong]).toEqual([1, 3, ["v2", "l1"]]);
    expect(r.parts).toEqual([
      { part: "P1", section: "vocabulary", correct: 1, total: 2 },
      { part: "listening", section: "listening", correct: 0, total: 1 },
    ]);
    expect(r.prediction?.passed).toBe(false);
  });
});

describe("spokenScript", () => {
  it("drops speaker labels and ruby marks", () => {
    expect(spokenScript("質問です\n[先生|せんせい]：はい。\n女：いいえ。")).toBe("質問です。 はい。 いいえ。");
  });
});
