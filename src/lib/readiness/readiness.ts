// Am I ready for a JLPT level? Each area of the exam gets a share done
// against a target, the weakest one is the next thing to study, and the
// level counts as ready only when every area meets its target. Pure: the
// numbers are gathered in readiness.server.ts.

export const READINESS_LEVELS = ["N5", "N4", "N3", "N2"] as const;
export type ReadinessLevel = (typeof READINESS_LEVELS)[number];

export type AreaId = "vocab" | "kanji" | "lessons" | "reading" | "listening" | "mock";

export interface AreaInput {
  /** Things done (words known, lessons finished, texts read…). */
  done: number;
  /** Things there are at this level. */
  total: number;
  /** For scored practice: average best score as a share (0–1) over what was done. */
  score?: number | null;
}

export interface MockInput {
  /** Predicted total and the pass line from the latest exam-mode mock at this level. */
  total: number;
  maxTotal: number;
  passTotal: number;
  passed: boolean;
  finishedAt: string;
}

export interface ReadinessInput {
  vocab: AreaInput;
  kanji: AreaInput;
  lessons: AreaInput;
  reading: AreaInput;
  listening: AreaInput;
  mock: MockInput | null;
}

export interface Area {
  id: AreaId;
  label: string;
  /** Progress towards this area's target, 0–1 (1 = target met). */
  progress: number;
  /** One line on where it stands, e.g. "512 of 700 words known". */
  detail: string;
  /** What meeting the target means. */
  target: string;
  met: boolean;
  href: string;
  /** What to do next, when the target isn't met. */
  next: string;
}

export interface Readiness {
  level: ReadinessLevel;
  areas: Area[];
  /** Overall readiness, 0–100: the weighted average of area progress. */
  percent: number;
  ready: boolean;
  /** The area to work on next (the weakest by weighted gap), or null when ready. */
  focus: Area | null;
}

/** Share of words and kanji to know (recognition card in Review) before the exam. */
export const KNOWN_TARGET = 0.8;
/** Practice texts to have done, and the average score to reach on them. */
export const PRACTICE_TARGET = { share: 0.6, score: 0.7 };
/** Margin above the pass line to aim for on a mock, in scaled points. */
export const MOCK_MARGIN = 10;

const WEIGHT: Record<AreaId, number> = { vocab: 3, kanji: 2, lessons: 1, reading: 1.5, listening: 1.5, mock: 1 };

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const pct = (x: number) => `${Math.round(x * 100)}%`;

function known(id: "vocab" | "kanji", a: AreaInput, level: ReadinessLevel): Area {
  const noun = id === "vocab" ? "words" : "kanji";
  const share = a.total ? a.done / a.total : 1;
  const progress = clamp(share / KNOWN_TARGET);
  return {
    id,
    label: id === "vocab" ? "Vocabulary" : "Kanji",
    progress,
    detail: `${a.done} of ${a.total} ${noun} known`,
    target: `Know ${pct(KNOWN_TARGET)} of the ${level} ${noun}`,
    met: progress >= 1,
    href: `/study?topic=${encodeURIComponent(`${id === "vocab" ? "words" : "kanji"}:${level}`)}`,
    next: `Study new ${level} ${noun} and clear your reviews`,
  };
}

function practice(id: "reading" | "listening", a: AreaInput, level: ReadinessLevel): Area {
  const label = id === "reading" ? "Reading" : "Listening";
  const coverage = a.total ? a.done / a.total / PRACTICE_TARGET.share : 1;
  const score = a.done ? (a.score ?? 0) / PRACTICE_TARGET.score : 0;
  // Both count: enough texts tried, and a good average on them.
  const progress = clamp(Math.min(clamp(coverage), clamp(score)) * 0.5 + clamp(coverage) * 0.25 + clamp(score) * 0.25);
  const met = coverage >= 1 && score >= 1;
  return {
    id,
    label,
    progress: met ? 1 : Math.min(progress, 0.99),
    detail: a.done ? `${a.done} of ${a.total} done · average ${pct(a.score ?? 0)}` : `None of ${a.total} done yet`,
    target: `Do ${pct(PRACTICE_TARGET.share)} of the ${level} ${id} sets with ${pct(PRACTICE_TARGET.score)} or more`,
    met,
    href: `/${id}`,
    next: coverage < 1 ? `Do the next ${level} ${id} set` : `Redo your weakest ${level} ${id} sets`,
  };
}

/** Readiness for one level from the learner's numbers. */
export function readiness(level: ReadinessLevel, input: ReadinessInput): Readiness {
  const lessonsShare = input.lessons.total ? input.lessons.done / input.lessons.total : 1;
  const m = input.mock;
  const mockTarget = m ? m.passTotal + MOCK_MARGIN : 0;
  const areas: Area[] = [
    known("vocab", input.vocab, level),
    known("kanji", input.kanji, level),
    {
      id: "lessons",
      label: "Grammar lessons",
      progress: clamp(lessonsShare),
      detail: `${input.lessons.done} of ${input.lessons.total} lessons done`,
      target: `Finish every ${level} lesson`,
      met: lessonsShare >= 1,
      href: "/lessons",
      next: "Do your next lesson",
    },
    practice("reading", input.reading, level),
    practice("listening", input.listening, level),
    {
      id: "mock",
      label: "Mock test",
      progress: m ? clamp(m.total / Math.min(mockTarget, m.maxTotal)) : 0,
      detail: m ? `Last exam-mode mock: ${m.total}/${m.maxTotal} (pass ${m.passTotal})${m.passed ? ", passed" : ""}` : "No exam-mode mock yet",
      target: `Pass a full ${level} mock in exam mode, ${MOCK_MARGIN} points clear of the line`,
      met: !!m && m.passed && m.total >= Math.min(mockTarget, m.maxTotal),
      href: "/mock",
      next: m ? `Take a ${level} mock again` : `Take a ${level} mock in exam mode`,
    },
  ];
  const weightSum = areas.reduce((n, a) => n + WEIGHT[a.id], 0);
  const percent = Math.round((100 * areas.reduce((n, a) => n + WEIGHT[a.id] * a.progress, 0)) / weightSum);
  const ready = areas.every((a) => a.met);
  // Focus: the biggest weighted gap. Vocabulary and kanji first early on, since everything else builds on them.
  const focus = ready ? null : [...areas].filter((a) => !a.met).sort((a, b) => WEIGHT[b.id] * (1 - b.progress) - WEIGHT[a.id] * (1 - a.progress))[0];
  return { level, areas, percent, ready, focus };
}

/** Rough size of each level (new words), used to space checkpoints towards the exam. */
const LEVEL_WEIGHT: Record<ReadinessLevel, number> = { N5: 700, N4: 650, N3: 1700, N2: 1800 };

/**
 * Target dates to be ready for each level on the way to `target`, spacing the
 * time left by how much each remaining level asks. Levels already ready get
 * no date. Returns ISO dates (yyyy-mm-dd).
 */
export function checkpoints(
  today: string,
  examDate: string | null,
  target: string,
  ready: Partial<Record<ReadinessLevel, boolean>>,
): { level: ReadinessLevel; date: string }[] {
  if (!examDate) return [];
  const end = READINESS_LEVELS.indexOf(target as ReadinessLevel);
  if (end < 0) return [];
  const todo = READINESS_LEVELS.slice(0, end + 1).filter((l) => !ready[l]);
  const days = (Date.parse(examDate) - Date.parse(today)) / 86_400_000;
  if (days <= 0 || !todo.length) return [];
  const total = todo.reduce((n, l) => n + LEVEL_WEIGHT[l], 0);
  let acc = 0;
  return todo.map((level) => {
    acc += LEVEL_WEIGHT[level];
    const date = new Date(Date.parse(today) + Math.round((days * acc) / total) * 86_400_000);
    return { level, date: date.toISOString().slice(0, 10) };
  });
}
