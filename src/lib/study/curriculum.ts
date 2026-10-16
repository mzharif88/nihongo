import topicList from "../../../content/topics/topics.json";

// Unlock order for new SRS items before lessons exist: kana first, then
// kanji, words, then sentences. Radicals are a deck of their own (the
// "Radicals" topic): they never gate a kanji and never join another session.

export interface CurriculumItem {
  id: string;
  slug: string;
  type: string;
  jlpt_level: string;
  term: string;
  topic: string | null;
  tags: string[];
  prerequisites: string[];
  /** KANJIDIC newspaper frequency rank, when known (1 = most common). */
  data?: { freq?: number | null } | null;
}

const LEVEL_RANK: Record<string, number> = { preN5: 0, N5: 1, N4: 2, N3: 3, N2: 4, N1: 5 };

// Word topics in teaching order (content/topics/topics.json); unknown topics go last.
const TOPIC_ORDER: string[] = (topicList as { topics: { name: string }[] }).topics.map((t) => t.name);

function stage(item: CurriculumItem): number {
  const has = (t: string) => item.tags.includes(t);
  if (item.type === "kana") {
    const script = has("katakana") ? 3 : 0;
    return script + (has("combo") ? 2 : has("dakuten") ? 1 : 0);
  }
  const typeStage: Record<string, number> = { radical: 6, kanji: 7, word: 8, sentence: 9 };
  return typeStage[item.type] ?? 99;
}

export function topicRank(topic: string | null): number {
  const i = topic ? TOPIC_ORDER.indexOf(topic) : -1;
  return i === -1 ? TOPIC_ORDER.length : i;
}

const freqRank = (item: CurriculumItem) => item.data?.freq ?? Number.MAX_SAFE_INTEGER;

/** Sort key: level, stage, topic, frequency (common kanji first), then character order (Unicode kana order is gojūon order). */
export function compareCurriculum(a: CurriculumItem, b: CurriculumItem): number {
  return (
    (LEVEL_RANK[a.jlpt_level] ?? 9) - (LEVEL_RANK[b.jlpt_level] ?? 9) ||
    stage(a) - stage(b) ||
    topicRank(a.topic) - topicRank(b.topic) ||
    freqRank(a) - freqRank(b) ||
    (a.term < b.term ? -1 : a.term > b.term ? 1 : 0) ||
    a.slug.localeCompare(b.slug)
  );
}

/** Items that can be studied in SRS now (grammar points arrive with lessons). */
export const SRS_TYPES = ["kana", "radical", "kanji", "word", "sentence"];

/** Prerequisites that must be learned first. A kanji's radicals are shown with it, not required before it. */
export const gatingPrerequisites = (item: Pick<CurriculumItem, "prerequisites">) => item.prerequisites.filter((p) => !p.startsWith("radical-"));

/**
 * Pick the next `limit` items to introduce: not started yet, every
 * prerequisite learned (its recognition card has reached Review), in
 * curriculum order. Items in `first` (words from the learner's own
 * Newcomer phrases) jump ahead of everything but kana, which every answer
 * is written in.
 */
export function pickNewItems<T extends CurriculumItem>(
  candidates: T[],
  started: Set<string>,
  learnedSlugs: Set<string>,
  limit: number,
  first: Set<string> = new Set(),
): T[] {
  if (limit <= 0) return [];
  const band = (i: T) => (i.type === "kana" ? 0 : first.has(i.id) ? 1 : 2);
  return candidates
    // Radicals only come through their own topic.
    .filter((i) => SRS_TYPES.includes(i.type) && i.type !== "radical" && !started.has(i.id))
    .filter((i) => gatingPrerequisites(i).every((p) => learnedSlugs.has(p)))
    .sort((a, b) => band(a) - band(b) || compareCurriculum(a, b))
    .slice(0, limit);
}

/** A word's spellings as written: "会う", "〜時間" → 時間, "いく; ゆく" → both. */
const spellings = (term: string) =>
  term
    .replace(/\s*[(（].*?[)）]\s*/g, "")
    .split(/[;；、,]/)
    .map((t) => t.replace(/[〜～\s]/g, "").trim())
    .filter(Boolean);
const KANA_WORD = /^[ぁ-ゖァ-ヺー]+$/;

/**
 * Word items matching the dictionary forms a learner's phrases use. A
 * spelling must match; a word given in kana also matches by reading, but
 * only when that reading names a single word (はし could be 箸 or 橋).
 */
export function phraseWordIds(items: (CurriculumItem & { reading?: string | null })[], words: string[]): Set<string> {
  const wordItems = items.filter((i) => i.type === "word");
  const bySpelling = new Map<string, string[]>();
  const byReading = new Map<string, string[]>();
  for (const i of wordItems) {
    for (const s of spellings(i.term)) bySpelling.set(s, [...(bySpelling.get(s) ?? []), i.id]);
    for (const r of spellings(i.reading ?? "")) byReading.set(r, [...(byReading.get(r) ?? []), i.id]);
  }
  const ids = new Set<string>();
  for (const w of words) {
    const exact = bySpelling.get(w);
    if (exact) exact.forEach((id) => ids.add(id));
    else if (KANA_WORD.test(w) && byReading.get(w)?.length === 1) ids.add(byReading.get(w)![0]);
  }
  return ids;
}
