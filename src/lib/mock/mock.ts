import { mockPapers, predictScore, type Prediction, type Section, type Tally } from "./format";

export interface QuestionRow {
  id: string;
  slug: string;
  position: number | null;
  section: Section;
  part: string | null;
  passage: string | null;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string | null;
  item_slugs: string[];
}

export interface MockRow {
  id: string;
  slug: string;
  jlpt_level: string;
  title: string;
  time_limit_min: number;
}

/** Answers keyed by question id: the option index picked, or null if left blank. */
export type Answers = Record<string, number | null>;

export interface PartResult {
  part: string;
  section: Section;
  correct: number;
  total: number;
}

export interface MockResult {
  correct: number;
  total: number;
  prediction: Prediction | null;
  parts: PartResult[];
  /** Ids of questions answered wrong or left blank. */
  wrong: string[];
}

const ORDER: Section[] = ["vocabulary", "grammar", "reading", "listening"];

/** Questions in exam order: by section, then position. */
export function examOrder<T extends Pick<QuestionRow, "section" | "position">>(questions: T[]): T[] {
  return [...questions].sort(
    (a, b) => ORDER.indexOf(a.section) - ORDER.indexOf(b.section) || (a.position ?? 0) - (b.position ?? 0),
  );
}

/** The mock split into its timed papers, each with its questions in order. */
export function buildPapers<T extends Pick<QuestionRow, "section" | "position">>(level: string, questions: T[]) {
  const ordered = examOrder(questions);
  const counts: Partial<Record<Section, number>> = {};
  for (const q of ordered) counts[q.section] = (counts[q.section] ?? 0) + 1;
  const papers = mockPapers(level, counts);
  if (papers.length === 0) {
    // Not a JLPT level: one untimed-rate paper with everything.
    return [{ id: "all", title: "Test", sections: ORDER, questions: ordered, minutes: Math.max(5, ordered.length) }];
  }
  return papers.map((p) => ({ id: p.id, title: p.title, sections: p.sections, minutes: p.minutes, questions: ordered.filter((q) => p.sections.includes(q.section)) }));
}

export function scoreMock(level: string, questions: QuestionRow[], answers: Answers): MockResult {
  const tally: Tally = {};
  const parts = new Map<string, PartResult>();
  const wrong: string[] = [];
  for (const q of examOrder(questions)) {
    const ok = answers[q.id] === q.answer;
    const t = (tally[q.section] ??= { correct: 0, total: 0 });
    t.total++;
    if (ok) t.correct++;
    else wrong.push(q.id);
    const key = q.part ?? q.section;
    const p = parts.get(key) ?? { part: key, section: q.section, correct: 0, total: 0 };
    p.total++;
    if (ok) p.correct++;
    parts.set(key, p);
  }
  const correct = questions.length - wrong.length;
  return { correct, total: questions.length, prediction: predictScore(level, tally), parts: [...parts.values()], wrong };
}

/** Text a listening script speaks: no speaker labels or furigana marks. */
export function spokenScript(script: string): string {
  return script
    .replace(/\[([^\]|]+)\|[^\]]+\]/g, "$1")
    .split("\n")
    .map((line) => line.replace(/^[^：:\s]{1,6}[：:]/, "").trim())
    .filter(Boolean)
    .map((line) => (/[。？！?!」]$/.test(line) ? line : `${line}。`))
    .join(" ");
}
