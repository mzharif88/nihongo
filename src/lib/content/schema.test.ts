import { describe, expect, it } from "vitest";
import { nextStatuses, parseImport } from "./schema";

const file = (kind: string, records: unknown[]) => ({ version: 1, kind, source: "claude-draft", records });

describe("parseImport", () => {
  it("accepts valid items and forces them to draft with the file's source", () => {
    const r = parseImport(
      file("items", [{ slug: "word-mizu", type: "word", jlpt_level: "N5", term: "水", reading: "みず", meaning: "water" }]),
    );
    expect(r.issues).toEqual([]);
    expect(r.records).toHaveLength(1);
    expect(r.records[0]).toMatchObject({ slug: "word-mizu", status: "draft", source: "claude-draft", tags: [], examples: [] });
  });

  it("ignores a status field in the file, so imports can't publish directly", () => {
    const r = parseImport(
      file("items", [{ slug: "word-mizu", type: "word", jlpt_level: "N5", term: "水", meaning: "water", status: "live" }]),
    );
    expect(r.records[0].status).toBe("draft");
  });

  it("reports bad records without dropping good ones", () => {
    const r = parseImport(
      file("items", [
        { slug: "word-mizu", type: "word", jlpt_level: "N5", term: "水", meaning: "water" },
        { slug: "Bad Slug", type: "word", jlpt_level: "N5", term: "火", meaning: "fire" },
        { slug: "word-hi", type: "word", jlpt_level: "N9", term: "火", meaning: "fire" },
        { slug: "word-mizu", type: "word", jlpt_level: "N5", term: "水", meaning: "water" },
      ]),
    );
    expect(r.records.map((x) => x.slug)).toEqual(["word-mizu"]);
    expect(r.issues.map((i) => i.index)).toEqual([1, 2, 3]);
    expect(r.issues[2].message).toMatch(/duplicate/);
  });

  it("checks that a question's answer indexes into its options", () => {
    const r = parseImport(
      file("questions", [
        { slug: "q-1", jlpt_level: "N5", section: "grammar", prompt: "わたし＿がくせいです。", options: ["は", "を"], answer: 2 },
      ]),
    );
    expect(r.records).toHaveLength(0);
    expect(r.issues[0].message).toMatch(/answer/);
  });

  it("validates sentence pattern templates", () => {
    const ok = parseImport(
      file("sentence_patterns", [
        {
          slug: "pattern-tai",
          jlpt_level: "N5",
          title: "〜たいです",
          template: [{ slot: "noun" }, { text: "を" }, { slot: "verb-masu" }, { text: "たいです" }],
        },
      ]),
    );
    expect(ok.issues).toEqual([]);
    const bad = parseImport(file("sentence_patterns", [{ slug: "p", jlpt_level: "N5", title: "x", template: [{}] }]));
    expect(bad.issues).toHaveLength(1);
  });

  it("rejects files with the wrong version or kind", () => {
    expect(() => parseImport({ version: 2, kind: "items", records: [{}] })).toThrow(/Not a valid import file/);
    expect(() => parseImport({ version: 1, kind: "users", records: [{}] })).toThrow(/Not a valid import file/);
  });
});

describe("nextStatuses", () => {
  it("only allows draft → reviewed → live, and sending back to draft", () => {
    expect(nextStatuses("draft")).toEqual(["reviewed"]);
    expect(nextStatuses("reviewed")).toEqual(["live", "draft"]);
    expect(nextStatuses("live")).toEqual(["draft"]);
  });
});
