import { OFFICIAL_PARTS } from "@/lib/mock/format";
import { isMarkup, parseMarkup, stripMarkup } from "@/lib/furigana";

// The content audit: rules that scan every pack for mistakes and for drift
// from the JLPT's own standards (official question counts and passage
// lengths, how the exam prints and tests readings) and from what suits
// beginners. `npm run audit` runs it and writes content/audit/report.json;
// tests/content-audit.test.ts runs it with every test run, so errors block
// a push and warnings can only go down (content/audit/baseline.json).

export type Severity = "error" | "warning" | "info";

export interface Finding {
  rule: string;
  file: string;
  slug?: string;
  message: string;
}

/** A content record as stored in a pack. */
export type Rec = Record<string, unknown> & { slug: string };

export interface Pack {
  /** Path under content/, e.g. "lessons/n5.json". */
  file: string;
  kind: string;
  records: Rec[];
}

export interface Content {
  packs: Pack[];
  /** Item records merged across packs by slug (later packs refine earlier ones). */
  items: Map<string, Rec>;
  /** Word topic names (content/topics/topics.json). */
  topics: Set<string>;
  /** Full-length mock sources (content/mock/*-full-*.source.json). */
  fullMocks: { file: string; level: string; questions: { section: string; part: string }[] }[];
}

export interface Rule {
  id: string;
  severity: Severity;
  title: string;
  /** Why it matters, in a sentence. */
  why: string;
  check: (c: Content) => Finding[];
}

export interface RuleResult {
  id: string;
  severity: Severity;
  title: string;
  why: string;
  count: number;
  samples: Finding[];
}

export interface Report {
  generatedAt: string;
  totals: Record<Severity, number>;
  rules: RuleResult[];
}

const LEVELS = ["preN5", "N5", "N4", "N3", "N2", "N1"];
const KANJI = /[㐀-鿿々]/;
const KANA_ONLY = /^[ぁ-ゖァ-ヺー・〜～\s]+$/;
/** A reading's first plain form: "べんきょう (する)" → べんきょう, "いく; ゆく" → いく. */
const firstForm = (s: string) => s.replace(/\s*[(（].*?[)）]\s*/g, "").split(/[;；、,]/)[0].replace(/[〜～\s]/g, "").trim();
/** A spelling as the learner sees it, 〜 kept so the counter 〜時間 stays apart from the noun 時間. */
const spelling = (s: string) => s.replace(/\s*[(（].*?[)）]\s*/g, "").split(/[;；、,]/)[0].trim();
const toHira = (s: string) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
const plainLength = (s: string) => stripMarkup(s).replace(/[\s{}]/g, "").length;

const records = (c: Content, kind: string) => c.packs.filter((p) => p.kind === kind).flatMap((p) => p.records.map((r) => ({ file: p.file, r })));
const words = (c: Content) => [...c.items.values()].filter((r) => r.type === "word");
const kanjiItems = (c: Content) => [...c.items.values()].filter((r) => r.type === "kanji");
const itemFile = "items (merged)";

/** Every Japanese sentence a learner reads: item examples, lesson lines, builder and grammar examples. */
function sentences(c: Content): { file: string; slug: string; level: string; text: string; reading?: string }[] {
  const out: { file: string; slug: string; level: string; text: string; reading?: string }[] = [];
  for (const p of c.packs) {
    for (const r of p.records) {
      const level = String(r.jlpt_level ?? "");
      for (const e of (r.examples as { jp?: string; reading?: string }[] | undefined) ?? []) if (e?.jp) out.push({ file: p.file, slug: r.slug, level, text: e.jp, reading: e.reading });
      for (const d of (r.dialogue as { jp?: string; reading?: string }[] | undefined) ?? []) if (d?.jp) out.push({ file: p.file, slug: r.slug, level, text: d.jp, reading: d.reading });
    }
  }
  return out;
}

/** Official passage length (characters) per reading part, from the JLPT guidebook and sample papers. */
const PASSAGE: Record<string, Record<string, [number, number]>> = {
  N5: { 短文: [80, 80], 中文: [250, 250], 情報検索: [250, 250] },
  N4: { 短文: [100, 200], 中文: [450, 450], 情報検索: [400, 400] },
  N3: { 短文: [150, 200], 中文: [350, 350], 長文: [550, 550], 情報検索: [600, 600] },
  N2: { 短文: [200, 200], 中文: [500, 500], 統合: [600, 600], 主張: [900, 900], 情報検索: [700, 700] },
};
const PASSAGE_TOLERANCE = 0.25;

/** The longest sentence a beginner at each level should meet (characters, without furigana). */
export const SENTENCE_LIMIT: Record<string, number> = { preN5: 25, N5: 30, N4: 40, N3: 55, N2: 70 };

export const RULES: Rule[] = [
  // ── Words ──────────────────────────────────────────────────────────
  {
    id: "word-reading",
    severity: "error",
    title: "Every word with kanji has a kana reading",
    why: "Furigana and the kana-only answers come from it; without one a beginner can't read the word.",
    check: (c) =>
      words(c)
        .filter((w) => KANJI.test(String(w.term)) && !(typeof w.reading === "string" && KANA_ONLY.test(firstForm(w.reading))))
        .map((w) => ({ rule: "word-reading", file: itemFile, slug: w.slug, message: `${w.term}: reading "${w.reading ?? ""}"` })),
  },
  {
    id: "word-level",
    severity: "error",
    title: "Every item has a JLPT level",
    why: "Levels decide what a beginner meets first and how the exam prints its kanji.",
    check: (c) =>
      [...c.items.values()]
        .filter((r) => r.type && r.type !== "grammar" && !LEVELS.includes(String(r.jlpt_level)))
        .map((r) => ({ rule: "word-level", file: itemFile, slug: r.slug, message: `${r.term}: level "${r.jlpt_level ?? ""}"` })),
  },
  {
    id: "word-meaning",
    severity: "error",
    title: "Every item has a meaning",
    why: "Recognition cards ask for it.",
    check: (c) =>
      [...c.items.values()]
        .filter((r) => r.type && !String(r.meaning ?? "").trim())
        .map((r) => ({ rule: "word-meaning", file: itemFile, slug: r.slug, message: `${r.term}: no meaning` })),
  },
  {
    id: "word-topic",
    severity: "error",
    title: "Every word has a topic from the taxonomy",
    why: "Words by topic must cover every word.",
    check: (c) =>
      words(c)
        .filter((w) => !c.topics.has(String(w.topic)))
        .map((w) => ({ rule: "word-topic", file: itemFile, slug: w.slug, message: `${w.term}: topic "${w.topic ?? ""}"` })),
  },
  {
    id: "word-duplicate",
    severity: "warning",
    title: "No word appears twice with the same spelling and reading",
    why: "Duplicates split a learner's progress and show twice in a session.",
    check: (c) => {
      const seen = new Map<string, Rec>();
      const out: Finding[] = [];
      for (const w of words(c)) {
        const key = `${spelling(String(w.term))}|${toHira(firstForm(String(w.reading ?? w.term)))}`;
        const first = seen.get(key);
        if (first) out.push({ rule: "word-duplicate", file: itemFile, slug: w.slug, message: `${w.term} (${w.reading}) duplicates ${first.slug}` });
        else seen.set(key, w);
      }
      return out;
    },
  },

  // ── Furigana ───────────────────────────────────────────────────────
  {
    id: "furigana-kana",
    severity: "error",
    title: "Furigana are kana",
    why: "Ruby over kanji must be readable by a beginner.",
    check: (c) => {
      const out: Finding[] = [];
      for (const s of sentences(c)) {
        if (!s.reading || !isMarkup(s.reading)) continue;
        for (const seg of parseMarkup(s.reading)) if (seg.ruby && !KANA_ONLY.test(seg.ruby)) out.push({ rule: "furigana-kana", file: s.file, slug: s.slug, message: `[${seg.text}|${seg.ruby}]` });
      }
      return out;
    },
  },
  {
    id: "furigana-matches-text",
    severity: "error",
    title: "Furigana markup spells the same sentence",
    why: "If the ruby version drifts from the text, the learner sees a different sentence than the one checked.",
    check: (c) =>
      sentences(c)
        .filter((s) => s.reading && isMarkup(s.reading) && stripMarkup(s.reading).replace(/\s/g, "") !== s.text.replace(/\s/g, ""))
        .map((s) => ({ rule: "furigana-matches-text", file: s.file, slug: s.slug, message: `${s.text} ≠ ${stripMarkup(s.reading!)}` })),
  },
  {
    id: "furigana-dictionary",
    severity: "warning",
    title: "Furigana on a whole word match its dictionary reading",
    why: "Generated furigana can misread a compound (目撃者 もくげきもの); the word list says how it's read.",
    check: (c) => {
      const readings = new Map<string, Set<string>>();
      for (const w of words(c)) {
        const term = firstForm(String(w.term));
        if (!KANJI.test(term) || term.length < 2 || typeof w.reading !== "string") continue;
        for (const r of String(w.reading).split(/[;；]/)) readings.set(term, (readings.get(term) ?? new Set()).add(toHira(firstForm(r))));
      }
      const out: Finding[] = [];
      for (const s of sentences(c)) {
        if (!s.reading || !isMarkup(s.reading)) continue;
        for (const seg of parseMarkup(s.reading)) {
          const known = seg.ruby ? readings.get(seg.text) : undefined;
          const ruby = toHira(seg.ruby ?? "");
          // Skip okurigana split off (支払|しはら + い) and numbers or 何 with a counter (十分 じゅっぷん, 何分 なんぷん).
          const fits = !known || [...known].some((r) => r === ruby || r.startsWith(ruby)) || /^[一二三四五六七八九十百千万何]/.test(seg.text);
          if (!fits && known) out.push({ rule: "furigana-dictionary", file: s.file, slug: s.slug, message: `[${seg.text}|${seg.ruby}] (dictionary: ${[...known].join("・")}) in ${s.text}` });
        }
      }
      return out;
    },
  },

  // ── Kanji ──────────────────────────────────────────────────────────
  {
    id: "kanji-key-reading",
    severity: "error",
    title: "A kanji's key reading is one of its on or kun readings",
    why: "The key reading is shown over the kanji on its card.",
    check: (c) =>
      kanjiItems(c).flatMap((k) => {
        const d = k.data as { on?: string[]; kun?: string[] } | undefined;
        if (!d) return [];
        const all = new Set([...(d.on ?? []), ...(d.kun ?? [])].map(toHira));
        return k.reading && !all.has(toHira(String(k.reading)))
          ? [{ rule: "kanji-key-reading", file: itemFile, slug: k.slug, message: `${k.term}: ${k.reading} not in ${[...all].join("・")}` }]
          : [];
      }),
  },
  {
    id: "kanji-examples",
    severity: "warning",
    title: "Every kanji has example words",
    why: "Readings are learned and quizzed through words, as the JLPT tests them.",
    check: (c) =>
      kanjiItems(c)
        .filter((k) => !((k.data as { examples?: unknown[] } | undefined)?.examples?.length))
        .map((k) => ({ rule: "kanji-examples", file: itemFile, slug: k.slug, message: `${k.term}: no example words` })),
  },
  {
    id: "kanji-quiz-word",
    severity: "error",
    title: "A kanji's quiz word contains it and its wrong options differ from the answer",
    why: "The reading quiz asks how that word is read.",
    check: (c) =>
      kanjiItems(c).flatMap((k) => {
        const ex = (k.data as { examples?: { term: string; reading: string; misreadings: string[] }[] } | undefined)?.examples ?? [];
        return ex.flatMap((e) =>
          !e.term.includes(String(k.term)) || e.misreadings.includes(e.reading)
            ? [{ rule: "kanji-quiz-word", file: itemFile, slug: k.slug, message: `${k.term}: ${e.term} ${e.reading}` }]
            : [],
        );
      }),
  },
  {
    id: "kanji-misreadings",
    severity: "info",
    title: "Kanji quiz words with fewer than 3 exam-style wrong options",
    why: "These are topped up from other words' readings, which is easier than the real exam.",
    check: (c) =>
      kanjiItems(c).flatMap((k) => {
        const e = (k.data as { examples?: { term: string; misreadings: string[] }[] } | undefined)?.examples?.[0];
        return e && e.misreadings.length < 3 ? [{ rule: "kanji-misreadings", file: itemFile, slug: k.slug, message: `${k.term}: ${e.term} has ${e.misreadings.length}` }] : [];
      }),
  },

  // ── Questions (mocks, reading, listening) ──────────────────────────
  {
    id: "question-answer",
    severity: "error",
    title: "Every question has a valid answer and distinct options",
    why: "A wrong key or two identical options makes a question unanswerable.",
    check: (c) =>
      records(c, "questions").flatMap(({ file, r }) => {
        const options = (r.options as string[] | undefined) ?? [];
        const answer = r.answer as number;
        const distinct = new Set(options.map((o) => stripMarkup(o).trim())).size === options.length;
        return options.length < 2 || !Number.isInteger(answer) || answer < 0 || answer >= options.length || !distinct
          ? [{ rule: "question-answer", file, slug: r.slug, message: `answer ${answer} of ${options.length}${distinct ? "" : ", duplicate options"}` }]
          : [];
      }),
  },
  {
    id: "question-option-count",
    severity: "warning",
    title: "Options per question match the JLPT: 4, or 3 for 即時応答",
    why: "The exam's format is part of what's being practised.",
    check: (c) =>
      records(c, "questions")
        .filter(({ r }) => r.mock_test_slug)
        .flatMap(({ file, r }) => {
          const want = String(r.part ?? "").includes("即時応答") ? 3 : 4;
          const got = ((r.options as string[] | undefined) ?? []).length;
          return got !== want ? [{ rule: "question-option-count", file, slug: r.slug, message: `${r.part}: ${got} options, JLPT has ${want}` }] : [];
        }),
  },
  {
    id: "kanji-reading-target",
    severity: "error",
    title: "漢字読み questions underline a word with kanji",
    why: "The part tests reading the underlined kanji word.",
    check: (c) =>
      records(c, "questions")
        .filter(({ r }) => String(r.part ?? "").includes("漢字読み"))
        .flatMap(({ file, r }) => {
          const target = /\{\{(.+?)\}\}/.exec(String(r.prompt ?? ""))?.[1];
          return !target || !KANJI.test(stripMarkup(target)) ? [{ rule: "kanji-reading-target", file, slug: r.slug, message: String(r.prompt) }] : [];
        }),
  },
  {
    id: "question-links",
    severity: "error",
    title: "Questions and lessons point at items and texts that exist",
    why: "A broken link drops a question's text or the words its mistakes should send to review.",
    check: (c) => {
      const texts = new Set(records(c, "texts").map(({ r }) => r.slug));
      const out: Finding[] = [];
      for (const { file, r } of [...records(c, "questions"), ...records(c, "lessons")]) {
        if (r.text_slug && !texts.has(String(r.text_slug))) out.push({ rule: "question-links", file, slug: r.slug, message: `text ${r.text_slug} missing` });
        for (const s of (r.item_slugs as string[] | undefined) ?? []) if (!c.items.has(s)) out.push({ rule: "question-links", file, slug: r.slug, message: `item ${s} missing` });
        if (r.grammar_slug && !c.items.has(String(r.grammar_slug))) out.push({ rule: "question-links", file, slug: r.slug, message: `grammar ${r.grammar_slug} missing` });
      }
      return out;
    },
  },
  {
    id: "mock-official-counts",
    severity: "error",
    title: "Full-length mocks have the official number of questions in every part",
    why: "They stand in for the real exam.",
    check: (c) =>
      c.fullMocks.flatMap((m) =>
        (OFFICIAL_PARTS[m.level as keyof typeof OFFICIAL_PARTS] ?? []).flatMap((p) => {
          const got = m.questions.filter((q) => q.section === p.section && q.part.includes(p.part)).length;
          return got !== p.count ? [{ rule: "mock-official-counts", file: m.file, message: `${p.section} ${p.part}: ${got}, official ${p.count}` }] : [];
        }),
      ),
  },
  {
    id: "passage-length",
    severity: "warning",
    title: "Reading passages are close to the official length",
    why: "Passage length is a large part of what makes each level's reading hard.",
    check: (c) => {
      const out: Finding[] = [];
      const seen = new Set<string>();
      for (const { file, r } of records(c, "questions")) {
        if (r.section !== "reading" || !r.passage || !r.mock_test_slug) continue;
        const key = `${r.mock_test_slug}|${String(r.passage).slice(0, 40)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const targets = PASSAGE[String(r.jlpt_level)] ?? {};
        const part = Object.keys(targets).find((p) => String(r.part ?? "").includes(p));
        if (!part) continue;
        const [lo, hi] = targets[part];
        const n = plainLength(String(r.passage));
        // 統合理解 has two passages; the guide's figure is for both together.
        if (n < lo * (1 - PASSAGE_TOLERANCE) || n > hi * (1 + PASSAGE_TOLERANCE))
          out.push({ rule: "passage-length", file, slug: r.slug, message: `${r.part}: ${n} characters, official ${lo === hi ? lo : `${lo}–${hi}`}` });
      }
      return out;
    },
  },

  // ── Beginner friendliness ──────────────────────────────────────────
  {
    id: "sentence-length",
    severity: "warning",
    title: "Example and lesson sentences suit their level's length",
    why: `Beginners read short sentences first: up to ${SENTENCE_LIMIT.N5} characters at N5, ${SENTENCE_LIMIT.N4} at N4, ${SENTENCE_LIMIT.N3} at N3, ${SENTENCE_LIMIT.N2} at N2.`,
    check: (c) =>
      sentences(c)
        .filter((s) => SENTENCE_LIMIT[s.level] && plainLength(s.text) > SENTENCE_LIMIT[s.level])
        .map((s) => ({ rule: "sentence-length", file: s.file, slug: s.slug, message: `${s.level}, ${plainLength(s.text)} characters: ${stripMarkup(s.text)}` })),
  },
  {
    id: "grammar-examples",
    severity: "warning",
    title: "Every grammar point has at least two example sentences",
    why: "One example isn't enough to see how a pattern bends to different words.",
    check: (c) =>
      [...c.items.values()]
        .filter((r) => r.type === "grammar" && ((r.examples as unknown[] | undefined) ?? []).length < 2)
        .map((r) => ({ rule: "grammar-examples", file: itemFile, slug: r.slug, message: `${r.term}: ${((r.examples as unknown[] | undefined) ?? []).length} example(s)` })),
  },
  {
    id: "lesson-grammar-level",
    severity: "warning",
    title: "A lesson's grammar point isn't above the lesson's level",
    why: "Beginners shouldn't meet a harder level's grammar as the point of a lesson.",
    check: (c) =>
      records(c, "lessons").flatMap(({ file, r }) => {
        const g = r.grammar_slug ? c.items.get(String(r.grammar_slug)) : undefined;
        return g && LEVELS.indexOf(String(g.jlpt_level)) > LEVELS.indexOf(String(r.jlpt_level))
          ? [{ rule: "lesson-grammar-level", file, slug: r.slug, message: `${r.jlpt_level} lesson teaches ${g.jlpt_level} ${g.term}` }]
          : [];
      }),
  },
];

const SAMPLES = 25;

export function runAudit(content: Content, rules: Rule[] = RULES, now = new Date()): Report {
  const results = rules.map((rule) => {
    const findings = rule.check(content);
    return { id: rule.id, severity: rule.severity, title: rule.title, why: rule.why, count: findings.length, samples: findings.slice(0, SAMPLES) };
  });
  const totals: Record<Severity, number> = { error: 0, warning: 0, info: 0 };
  for (const r of results) totals[r.severity] += r.count;
  return { generatedAt: now.toISOString(), totals, rules: results };
}

/** Rules whose warning count rose above the baseline: new problems that shouldn't be shipped. */
export function regressions(report: Report, baseline: Record<string, number>): RuleResult[] {
  return report.rules.filter((r) => r.severity === "warning" && r.count > (baseline[r.id] ?? 0));
}
