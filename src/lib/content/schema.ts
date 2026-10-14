import { z } from "zod";

// The JSON import format for content drafted in Claude chat (or ported from
// the old app). One file = one content kind. Every record is keyed by `slug`;
// re-importing a slug updates that row and sends it back to `draft`.
// See docs/import-format.md for the human-readable version.

export const IMPORT_FORMAT_VERSION = 1;

export const JLPT_LEVELS = ["preN5", "N5", "N4", "N3", "N2", "N1"] as const;
export const ITEM_TYPES = ["kana", "radical", "kanji", "word", "grammar", "sentence"] as const;
export const CONTENT_STATUSES = ["draft", "reviewed", "live"] as const;
export const SECTIONS = ["vocabulary", "grammar", "reading", "listening"] as const;

export type ContentStatus = (typeof CONTENT_STATUSES)[number];

const slug = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*$/, "lowercase letters, digits and hyphens only, e.g. word-mizu");
const level = z.enum(JLPT_LEVELS);
const slugList = z.array(slug).default([]);
const optionalText = z.string().trim().min(1).optional();

const example = z.object({ jp: z.string().min(1), en: z.string().min(1), reading: z.string().optional() });

export const itemSchema = z.object({
  slug,
  type: z.enum(ITEM_TYPES),
  jlpt_level: level,
  term: z.string().min(1),
  reading: optionalText,
  romaji: optionalText,
  meaning: z.string().min(1),
  mnemonic: optionalText,
  examples: z.array(example).default([]),
  data: z.record(z.string(), z.unknown()).default({}),
  skill: optionalText,
  topic: optionalText,
  grammar_point: optionalText,
  tags: z.array(z.string().min(1)).default([]),
  prerequisites: slugList,
  audio_url: z.url().optional(),
});

const dialogueLine = z.object({
  speaker: z.string().min(1),
  jp: z.string().min(1),
  en: z.string().min(1),
  reading: z.string().optional(),
  audio_url: z.url().optional(),
});

const quickCheck = z
  .object({
    prompt: z.string().min(1),
    options: z.array(z.string().min(1)).min(2),
    answer: z.number().int().min(0),
    explanation: optionalText,
  })
  .refine((c) => c.answer < c.options.length, { message: "answer must index into options", path: ["answer"] });

export const lessonSchema = z.object({
  slug,
  jlpt_level: level,
  position: z.number().int().min(0),
  title: z.string().min(1),
  situation: optionalText,
  item_slugs: slugList,
  grammar_slug: slug.optional(),
  dialogue: z.array(dialogueLine).default([]),
  checks: z.array(quickCheck).default([]),
  notes: optionalText,
});

export const textSchema = z.object({
  slug,
  jlpt_level: level,
  kind: z.enum(["dialogue", "listening", "reading", "story"]),
  title: z.string().min(1),
  body: z.string().min(1),
  audio_url: z.url().optional(),
});

export const mockTestSchema = z.object({
  slug,
  jlpt_level: level,
  title: z.string().min(1),
  time_limit_min: z.number().int().positive(),
});

export const questionSchema = z
  .object({
    slug,
    mock_test_slug: slug.optional(),
    text_slug: slug.optional(),
    position: z.number().int().min(0).optional(),
    part: optionalText,
    jlpt_level: level,
    section: z.enum(SECTIONS),
    passage: optionalText,
    prompt: z.string().min(1),
    options: z.array(z.string().min(1)).min(2),
    answer: z.number().int().min(0),
    explanation: optionalText,
    item_slugs: slugList,
  })
  .refine((q) => q.answer < q.options.length, { message: "answer must index into options", path: ["answer"] });

// A sentence-builder exercise: the sentence split into tiles to arrange,
// plus decoy tiles and any other word orders that also count as correct.
const builderExample = example.extend({
  tiles: z.array(z.string().min(1)).min(2).optional(),
  distractors: z.array(z.string().min(1)).default([]),
  also: z.array(z.string().min(1)).default([]),
});

const patternSlot = z.object({
  // Either fixed text (particles, endings) or a typed slot the learner fills.
  text: z.string().optional(),
  slot: z
    .enum(["noun", "verb-dict", "verb-masu", "verb-te", "verb-nai", "verb-ta", "i-adj", "na-adj", "place", "time", "person", "number"])
    .optional(),
  label: z.string().optional(),
  romaji: z.string().optional(),
});

export const sentencePatternSchema = z.object({
  slug,
  jlpt_level: level,
  position: z.number().int().min(0).optional(),
  grammar_slug: slug.optional(),
  title: z.string().min(1),
  english: optionalText,
  template: z
    .array(patternSlot.refine((p) => p.text || p.slot, { message: "each part needs text or slot" }))
    .min(1),
  conjugation_rules: z.array(z.record(z.string(), z.unknown())).default([]),
  examples: z.array(builderExample).default([]),
  notes: optionalText,
});

export const CONTENT_KINDS = {
  items: itemSchema,
  lessons: lessonSchema,
  texts: textSchema,
  mock_tests: mockTestSchema,
  questions: questionSchema,
  sentence_patterns: sentencePatternSchema,
} as const;

export type ContentKind = keyof typeof CONTENT_KINDS;
export const CONTENT_KIND_NAMES = Object.keys(CONTENT_KINDS) as ContentKind[];

export function isContentKind(value: string): value is ContentKind {
  return value in CONTENT_KINDS;
}

export const importFileSchema = z.object({
  version: z.literal(IMPORT_FORMAT_VERSION),
  kind: z.enum(CONTENT_KIND_NAMES as [ContentKind, ...ContentKind[]]),
  source: z.string().min(1).default("import"),
  records: z.array(z.unknown()).min(1),
});

export interface ImportIssue {
  index: number;
  slug?: string;
  message: string;
}

export interface ParsedImport {
  kind: ContentKind;
  source: string;
  records: Record<string, unknown>[];
  issues: ImportIssue[];
}

/**
 * Validate an import file. Returns every record that passed and a list of
 * issues for the ones that did not, so one bad record doesn't block the rest.
 */
export function parseImport(input: unknown): ParsedImport {
  const file = importFileSchema.safeParse(input);
  if (!file.success) {
    throw new Error(`Not a valid import file: ${z.prettifyError(file.error)}`);
  }
  const { kind, source, records } = file.data;
  const schema = CONTENT_KINDS[kind];
  const parsed: Record<string, unknown>[] = [];
  const issues: ImportIssue[] = [];
  const seen = new Set<string>();

  records.forEach((raw, index) => {
    const result = schema.safeParse(raw);
    const rawSlug = typeof (raw as { slug?: unknown })?.slug === "string" ? (raw as { slug: string }).slug : undefined;
    if (!result.success) {
      issues.push({ index, slug: rawSlug, message: z.prettifyError(result.error) });
      return;
    }
    const record = result.data as Record<string, unknown> & { slug: string };
    if (seen.has(record.slug)) {
      issues.push({ index, slug: record.slug, message: "duplicate slug in this file" });
      return;
    }
    seen.add(record.slug);
    parsed.push({ ...record, source, status: "draft" });
  });

  return { kind, source, records: parsed, issues };
}

/** Allowed review-queue moves. */
export function nextStatuses(status: ContentStatus): ContentStatus[] {
  switch (status) {
    case "draft":
      return ["reviewed"];
    case "reviewed":
      return ["live", "draft"];
    case "live":
      return ["draft"];
  }
}
