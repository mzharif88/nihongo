import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PACK_GROUPS } from "@/lib/content/packs";
import { parseImport } from "@/lib/content/schema";
import { stripMarkup } from "@/lib/furigana";
import { isSituation, situationGroup } from "@/lib/lessons/lessons";

const CONTENT = join(__dirname, "..", "content");
const loadFrom = (group: string, file: string) =>
  parseImport(JSON.parse(readFileSync(join(CONTENT, group, file), "utf8")));
const load = (file: string) => loadFrom("legacy", file);

const allPacks = PACK_GROUPS.flatMap((g) => g.packs.map((p) => [g.id, p.file] as const));

describe("every bundled pack", () => {
  it.each(allPacks)("%s/%s validates with no skipped records", (group, file) => {
    const parsed = loadFrom(group, file);
    expect(parsed.issues).toEqual([]);
    expect(parsed.records.length).toBeGreaterThan(0);
  });
});

describe("open-data packs", () => {
  const FIXES = "00-legacy-level-fixes.json";
  const legacySlugs = new Set(load("01-items.json").records.map((r) => r.slug as string));
  const opendata = PACK_GROUPS.find((g) => g.id === "opendata")!.packs;

  it("only touch existing legacy items through the fixes pack", () => {
    for (const r of loadFrom("opendata", FIXES).records) expect(legacySlugs).toContain(r.slug);
    for (const { file } of opendata.filter((p) => p.file !== FIXES)) {
      for (const r of loadFrom("opendata", file).records) expect(legacySlugs, `${file}: ${r.slug}`).not.toContain(r.slug);
    }
  });

  it("never repeat a slug or an item across packs", () => {
    const records = opendata.flatMap((p) => loadFrom("opendata", p.file).records);
    expect(new Set(records.map((r) => r.slug)).size).toBe(records.length);
    expect(new Set(records.map((r) => `${r.type}:${r.term}:${r.reading}`)).size).toBe(records.length);
  });

  it("never carries WaniKani fields", () => {
    for (const { file } of opendata) {
      const raw = readFileSync(join(CONTENT, "opendata", file), "utf8");
      expect(raw, file).not.toMatch(/"wk_/);
    }
  });
});

describe("legacy packs", () => {
  it("only references slugs that exist", () => {
    const items = new Set(load("01-items.json").records.map((r) => r.slug as string));
    const mocks = new Set(load("03-mock-tests.json").records.map((r) => r.slug as string));
    for (const item of load("01-items.json").records) {
      for (const p of item.prerequisites as string[]) expect(items, `${item.slug} → ${p}`).toContain(p);
    }
    for (const q of load("04-questions.json").records) {
      if (q.mock_test_slug) expect(mocks).toContain(q.mock_test_slug);
      for (const s of q.item_slugs as string[]) expect(items, `${q.slug} → ${s}`).toContain(s);
    }
  });
});

describe("memory hints", () => {
  const mnemonics = JSON.parse(readFileSync(join(CONTENT, "mnemonics", "radicals.json"), "utf8")) as Record<string, string>;
  const bySlug = new Map(allPacks.flatMap(([g, f]) => loadFrom(g, f).records).map((r) => [r.slug as string, r]));

  it("only names items that exist, and every one made it into its pack", () => {
    for (const [slug, text] of Object.entries(mnemonics)) {
      expect(text.trim(), slug).not.toBe("");
      expect(bySlug.get(slug)?.mnemonic, slug).toBe(text);
    }
  });

  it("never use English sound-alikes for words or kanji", () => {
    for (const r of bySlug.values()) {
      if ((r.type === "word" || r.type === "kanji") && typeof r.mnemonic === "string") {
        expect(r.mnemonic, `${r.slug}: ${r.mnemonic}`).not.toMatch(/"[^"]+"/);
      }
    }
  });

  it("start word hints from the word's own kanji", () => {
    for (const r of bySlug.values()) {
      if (r.type !== "word" || !/[\u3400-\u9fff]/.test(r.term as string)) continue;
      const first = [...(r.term as string)].find((c) => /[\u3400-\u9fff]/.test(c))!;
      if (r.mnemonic) expect(r.mnemonic, r.slug as string).toContain(first);
    }
  });
});

describe("lesson packs", () => {
  const itemSlugs = new Map<string, string>();
  for (const g of PACK_GROUPS.filter((g) => g.id !== "lessons")) {
    for (const p of g.packs) {
      const parsed = loadFrom(g.id, p.file);
      if (parsed.kind === "items") for (const r of parsed.records) itemSlugs.set(r.slug as string, r.type as string);
    }
  }
  const lessons = PACK_GROUPS.find((g) => g.id === "lessons")!.packs.flatMap((p) => loadFrom("lessons", p.file).records);

  it("only point at items and grammar that exist", () => {
    for (const l of lessons) {
      for (const s of l.item_slugs as string[]) expect(itemSlugs.has(s), `${l.slug} → ${s}`).toBe(true);
      if (l.grammar_slug) expect(itemSlugs.get(l.grammar_slug as string), `${l.slug} → ${l.grammar_slug}`).toBe("grammar");
    }
  });

  it("have unique positions per level, three checks each and six per situation", () => {
    const keys = lessons.map((l) => `${l.jlpt_level}:${l.position}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const l of lessons) {
      const situation = isSituation(l.slug as string);
      expect((l.checks as unknown[]).length, l.slug as string).toBe(situation ? 6 : 3);
      if (situation) expect(situationGroup(l.slug as string), l.slug as string).not.toBeNull();
    }
  });

  it("carry furigana for every dialogue line with kanji", () => {
    for (const l of lessons) {
      for (const line of l.dialogue as { jp: string; reading?: string }[]) {
        if (/[\u3400-\u9fff]/.test(line.jp)) expect(line.reading, line.jp).toMatch(/\[[^\]|]+\|[^\]]+\]/);
      }
    }
  });
});

describe("builder packs", () => {
  const patterns = PACK_GROUPS.find((g) => g.id === "builder")!.packs.flatMap((p) => loadFrom("builder", p.file).records);
  const grammar = new Set(
    [
      ...load("01-items.json").records,
      ...PACK_GROUPS.find((g) => g.id === "grammar")!.packs.flatMap((p) => loadFrom("grammar", p.file).records),
    ]
      .filter((r) => r.type === "grammar")
      .map((r) => r.slug as string),
  );
  const strip = stripMarkup;

  it("update legacy patterns or bring their own template, with real grammar points", () => {
    const legacy = new Set(load("02-sentence-patterns.json").records.map((r) => r.slug as string));
    for (const p of patterns) {
      expect(legacy.has(p.slug as string) || (p.template as unknown[]).length > 0, p.slug as string).toBe(true);
      if (p.grammar_slug) expect(grammar, `${p.slug} → ${p.grammar_slug}`).toContain(p.grammar_slug);
    }
  });

  it("have tiles that spell each sentence exactly", () => {
    for (const p of patterns) {
      for (const ex of p.examples as { jp: string; tiles: string[]; reading?: string }[]) {
        expect(ex.tiles.map(strip).join("") + "。", `${p.slug}: ${ex.jp}`).toBe(ex.jp);
        if (ex.reading) expect(strip(ex.reading)).toBe(ex.jp);
      }
    }
  });

  it("never offer a decoy that could also be correct", () => {
    for (const p of patterns) {
      for (const ex of p.examples as { tiles: string[]; distractors: string[] }[]) {
        for (const d of ex.distractors) expect(ex.tiles.map(strip), `${p.slug}: ${d}`).not.toContain(strip(d));
      }
    }
  });
});

describe("kana duplicate merges", () => {
  const { merges } = JSON.parse(readFileSync(join(CONTENT, "merges", "kana-duplicates.json"), "utf8")) as {
    merges: { from: string; to: string; topic: string }[];
  };
  const all = PACK_GROUPS.filter((g) => g.id === "legacy" || g.id === "opendata").flatMap((g) =>
    g.packs.map((p) => loadFrom(g.id, p.file)).filter((p) => p.kind === "items").flatMap((p) => p.records),
  );
  const bySlug = new Map(all.map((r) => [r.slug as string, r]));

  it("drop every kana copy and keep the kanji word, which has a topic", () => {
    for (const m of merges) {
      expect(bySlug.has(m.from), m.from).toBe(false);
      // The word topic taxonomy (content/topics) now decides its topic.
      expect(bySlug.get(m.to)?.topic, m.to).toBeTruthy();
    }
  });

  it("leave nothing pointing at a dropped word", () => {
    const gone = new Set(merges.map((m) => m.from));
    for (const r of all) for (const p of r.prerequisites as string[]) expect(gone.has(p), `${r.slug} → ${p}`).toBe(false);
  });
});

describe("mock and reading packs", () => {
  const items = new Set(
    PACK_GROUPS.filter((g) => ["legacy", "opendata", "grammar"].includes(g.id)).flatMap((g) =>
      g.packs.map((p) => loadFrom(g.id, p.file)).filter((p) => p.kind === "items").flatMap((p) => p.records.map((r) => r.slug as string)),
    ),
  );
  const packsOf = (group: string, kind: string) =>
    PACK_GROUPS.find((g) => g.id === group)!.packs.map((p) => loadFrom(group, p.file)).filter((p) => p.kind === kind).flatMap((p) => p.records);
  const mocks = new Set(packsOf("mock", "mock_tests").map((r) => r.slug as string));
  const texts = new Set(packsOf("reading", "texts").map((r) => r.slug as string));
  const questions = [...packsOf("mock", "questions"), ...packsOf("reading", "questions")];

  it("point at real tests, texts and items", () => {
    for (const q of questions) {
      if (q.mock_test_slug) expect(mocks).toContain(q.mock_test_slug);
      if (q.text_slug) expect(texts).toContain(q.text_slug);
      expect(q.mock_test_slug || q.text_slug, q.slug as string).toBeTruthy();
      for (const s of q.item_slugs as string[]) expect(items, `${q.slug} → ${s}`).toContain(s);
    }
  });

  it("give listening questions a script and reading questions a passage or text", () => {
    for (const q of questions) {
      if (q.section === "listening") expect(q.passage, q.slug as string).toBeTruthy();
      if (q.section === "reading" && q.mock_test_slug) expect(q.passage, q.slug as string).toBeTruthy();
    }
  });

  it("underline exactly one target in kanji-reading and writing questions", () => {
    for (const q of questions) {
      if (/漢字読み|表記/.test(String(q.part))) expect(String(q.prompt).match(/\{\{/g), q.slug as string).toHaveLength(1);
    }
  });
});

describe("grammar colours", () => {
  const roleMarks = /⟨[sovp]⟩/;
  const lines = PACK_GROUPS.find((g) => g.id === "lessons")!.packs.flatMap((p) =>
    loadFrom("lessons", p.file).records.flatMap((l) => l.dialogue as { jp: string; reading?: string }[]),
  );

  it("are on lesson dialogue with kanji (rerun npm run build:roles after building packs)", () => {
    const withKanji = lines.filter((l) => /[一-龯]/.test(l.jp));
    const tagged = withKanji.filter((l) => roleMarks.test(l.reading ?? ""));
    expect(tagged.length / withKanji.length).toBeGreaterThan(0.9);
  });

  it("never change the sentence itself", () => {
    for (const l of lines) if (l.reading) expect(stripMarkup(l.reading).replace(/\s/g, "")).toBe(l.jp.replace(/\s/g, ""));
  });
});

describe("word topics", () => {
  it("gives every word a topic from content/topics/topics.json", async () => {
    const { readdirSync, readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const names = new Set((JSON.parse(readFileSync(join(process.cwd(), "content/topics/topics.json"), "utf8")) as { topics: { name: string }[] }).topics.map((t) => t.name));
    const bad: string[] = [];
    let words = 0;
    for (const dir of ["legacy", "opendata"]) {
      for (const f of readdirSync(join(process.cwd(), "content", dir)).filter((f) => f.endsWith(".json") && !f.endsWith(".source.json"))) {
        const doc = JSON.parse(readFileSync(join(process.cwd(), "content", dir, f), "utf8"));
        if (doc.kind !== "items") continue;
        for (const r of doc.records as { type: string; slug: string; topic?: string }[]) {
          if (r.type !== "word") continue;
          words++;
          if (!r.topic || !names.has(r.topic)) bad.push(`${f}: ${r.slug} → ${r.topic}`);
        }
      }
    }
    expect(words).toBeGreaterThan(5000);
    expect(bad.slice(0, 10)).toEqual([]);
  });
});
