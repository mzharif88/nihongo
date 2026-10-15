// JLPT exam format: how each level splits into timed papers, how sections
// are scored, and the pass lines. Times are the official minutes per
// question, so a shorter mock gets proportionally less time. Question counts
// are the official 目安: N4/N5 from the December 2020 revision (jlpt.jp
// topics/202008171597200631), N3/N2 from the official guidebook.

export type Section = "vocabulary" | "grammar" | "reading" | "listening";
type Level = "N5" | "N4" | "N3" | "N2" | "N1";

export interface Paper {
  id: string;
  title: string;
  sections: Section[];
  /** Official minutes ÷ official question count. */
  minutesPerQuestion: number;
}

const P = (id: string, title: string, sections: Section[], minutes: number, questions: number): Paper => ({
  id,
  title,
  sections,
  minutesPerQuestion: minutes / questions,
});

export const PAPERS: Record<Level, Paper[]> = {
  N5: [
    P("vocab", "言語知識（文字・語彙） · Vocabulary", ["vocabulary"], 20, 21),
    P("grammar-reading", "言語知識（文法）・読解 · Grammar & reading", ["grammar", "reading"], 40, 22),
    P("listening", "聴解 · Listening", ["listening"], 30, 24),
  ],
  N4: [
    P("vocab", "言語知識（文字・語彙） · Vocabulary", ["vocabulary"], 25, 28),
    P("grammar-reading", "言語知識（文法）・読解 · Grammar & reading", ["grammar", "reading"], 55, 29),
    P("listening", "聴解 · Listening", ["listening"], 35, 28),
  ],
  N3: [
    P("vocab", "言語知識（文字・語彙） · Vocabulary", ["vocabulary"], 30, 35),
    P("grammar-reading", "言語知識（文法）・読解 · Grammar & reading", ["grammar", "reading"], 70, 39),
    P("listening", "聴解 · Listening", ["listening"], 40, 28),
  ],
  N2: [
    P("language-reading", "言語知識・読解 · Language & reading", ["vocabulary", "grammar", "reading"], 105, 75),
    P("listening", "聴解 · Listening", ["listening"], 50, 32),
  ],
  N1: [
    P("language-reading", "言語知識・読解 · Language & reading", ["vocabulary", "grammar", "reading"], 110, 71),
    P("listening", "聴解 · Listening", ["listening"], 60, 37),
  ],
};

export interface ScoreSection {
  label: string;
  sections: Section[];
  max: number;
  /** Sectional minimum: below this fails the exam whatever the total. */
  min: number;
}

const N5_N4: ScoreSection[] = [
  { label: "Language knowledge & reading", sections: ["vocabulary", "grammar", "reading"], max: 120, min: 38 },
  { label: "Listening", sections: ["listening"], max: 60, min: 19 },
];
const N3_N1: ScoreSection[] = [
  { label: "Language knowledge (vocabulary, grammar)", sections: ["vocabulary", "grammar"], max: 60, min: 19 },
  { label: "Reading", sections: ["reading"], max: 60, min: 19 },
  { label: "Listening", sections: ["listening"], max: 60, min: 19 },
];

export const SCORING: Record<Level, { sections: ScoreSection[]; passTotal: number }> = {
  N5: { sections: N5_N4, passTotal: 80 },
  N4: { sections: N5_N4, passTotal: 90 },
  N3: { sections: N3_N1, passTotal: 95 },
  N2: { sections: N3_N1, passTotal: 90 },
  N1: { sections: N3_N1, passTotal: 100 },
};

export const isExamLevel = (level: string): level is Level => level in PAPERS;

/** Papers that have questions in this mock, with their time limits. */
export function mockPapers(level: string, counts: Partial<Record<Section, number>>) {
  if (!isExamLevel(level)) return [];
  return PAPERS[level]
    .map((p) => {
      const questions = p.sections.reduce((n, s) => n + (counts[s] ?? 0), 0);
      return { ...p, questions, minutes: Math.max(3, Math.round(questions * p.minutesPerQuestion)) };
    })
    .filter((p) => p.questions > 0);
}

export type Tally = Partial<Record<Section, { correct: number; total: number }>>;

export interface Prediction {
  sections: { label: string; score: number; max: number; min: number; passed: boolean; correct: number; total: number }[];
  total: number;
  maxTotal: number;
  passTotal: number;
  passed: boolean;
}

/**
 * Predicted scaled scores: each scoring section's share of right answers times
 * its maximum. A rough guide (the real exam equates scores across sittings).
 */
export function predictScore(level: string, tally: Tally): Prediction | null {
  if (!isExamLevel(level)) return null;
  const { sections, passTotal } = SCORING[level];
  const scored = sections
    .map((s) => {
      const correct = s.sections.reduce((n, k) => n + (tally[k]?.correct ?? 0), 0);
      const total = s.sections.reduce((n, k) => n + (tally[k]?.total ?? 0), 0);
      const score = total ? Math.round((correct / total) * s.max) : 0;
      return { label: s.label, score, max: s.max, min: s.min, passed: total > 0 && score >= s.min, correct, total };
    })
    .filter((s) => s.total > 0);
  const total = scored.reduce((n, s) => n + s.score, 0);
  const maxTotal = scored.reduce((n, s) => n + s.max, 0);
  // A mock without every section can't pass the full exam; scale the line to what was tested.
  const line = Math.round((passTotal * maxTotal) / sections.reduce((n, s) => n + s.max, 0));
  return { sections: scored, total, maxTotal, passTotal: line, passed: total >= line && scored.every((s) => s.passed) };
}

/**
 * Official questions per part (目安), keyed by a fragment of the part label:
 * N5/N4 from the December 2020 revision, N3/N2 from the official guidebook.
 * Full-length mocks must match these exactly.
 */
export const OFFICIAL_PARTS: Record<"N5" | "N4" | "N3" | "N2", { section: Section; part: string; count: number }[]> = {
  N5: [
    { section: "vocabulary", part: "漢字読み", count: 7 },
    { section: "vocabulary", part: "表記", count: 5 },
    { section: "vocabulary", part: "文脈規定", count: 6 },
    { section: "vocabulary", part: "類義", count: 3 },
    { section: "grammar", part: "文の文法", count: 9 },
    { section: "grammar", part: "文の組み立て", count: 4 },
    { section: "grammar", part: "文章の文法", count: 4 },
    { section: "reading", part: "短文", count: 2 },
    { section: "reading", part: "中文", count: 2 },
    { section: "reading", part: "情報検索", count: 1 },
    { section: "listening", part: "課題理解", count: 7 },
    { section: "listening", part: "ポイント理解", count: 6 },
    { section: "listening", part: "発話表現", count: 5 },
    { section: "listening", part: "即時応答", count: 6 },
  ],
  N4: [
    { section: "vocabulary", part: "漢字読み", count: 7 },
    { section: "vocabulary", part: "表記", count: 5 },
    { section: "vocabulary", part: "文脈規定", count: 8 },
    { section: "vocabulary", part: "類義", count: 4 },
    { section: "vocabulary", part: "用法", count: 4 },
    { section: "grammar", part: "文の文法", count: 13 },
    { section: "grammar", part: "文の組み立て", count: 4 },
    { section: "grammar", part: "文章の文法", count: 4 },
    { section: "reading", part: "短文", count: 3 },
    { section: "reading", part: "中文", count: 3 },
    { section: "reading", part: "情報検索", count: 2 },
    { section: "listening", part: "課題理解", count: 8 },
    { section: "listening", part: "ポイント理解", count: 7 },
    { section: "listening", part: "発話表現", count: 5 },
    { section: "listening", part: "即時応答", count: 8 },
  ],
  N3: [
    { section: "vocabulary", part: "漢字読み", count: 8 },
    { section: "vocabulary", part: "表記", count: 6 },
    { section: "vocabulary", part: "文脈規定", count: 11 },
    { section: "vocabulary", part: "類義", count: 5 },
    { section: "vocabulary", part: "用法", count: 5 },
    { section: "grammar", part: "文法形式", count: 13 },
    { section: "grammar", part: "文の組み立て", count: 5 },
    { section: "grammar", part: "文章の文法", count: 5 },
    { section: "reading", part: "短文", count: 4 },
    { section: "reading", part: "中文", count: 6 },
    { section: "reading", part: "長文", count: 4 },
    { section: "reading", part: "情報検索", count: 2 },
    { section: "listening", part: "課題理解", count: 6 },
    { section: "listening", part: "ポイント理解", count: 6 },
    { section: "listening", part: "概要理解", count: 3 },
    { section: "listening", part: "発話表現", count: 4 },
    { section: "listening", part: "即時応答", count: 9 },
  ],
  N2: [
    { section: "vocabulary", part: "漢字読み", count: 5 },
    { section: "vocabulary", part: "表記", count: 5 },
    { section: "vocabulary", part: "語形成", count: 5 },
    { section: "vocabulary", part: "文脈規定", count: 7 },
    { section: "vocabulary", part: "類義", count: 5 },
    { section: "vocabulary", part: "用法", count: 5 },
    { section: "grammar", part: "文法形式", count: 12 },
    { section: "grammar", part: "文の組み立て", count: 5 },
    { section: "grammar", part: "文章の文法", count: 5 },
    { section: "reading", part: "短文", count: 5 },
    { section: "reading", part: "中文", count: 9 },
    { section: "reading", part: "統合理解", count: 2 },
    { section: "reading", part: "主張理解", count: 3 },
    { section: "reading", part: "情報検索", count: 2 },
    { section: "listening", part: "課題理解", count: 5 },
    { section: "listening", part: "ポイント理解", count: 6 },
    { section: "listening", part: "概要理解", count: 5 },
    { section: "listening", part: "即時応答", count: 12 },
    { section: "listening", part: "統合理解", count: 4 },
  ],
};
