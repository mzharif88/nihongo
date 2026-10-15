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
 * curriculum order.
 */
export function pickNewItems<T extends CurriculumItem>(
  candidates: T[],
  started: Set<string>,
  learnedSlugs: Set<string>,
  limit: number,
): T[] {
  if (limit <= 0) return [];
  return candidates
    // Radicals only come through their own topic.
    .filter((i) => SRS_TYPES.includes(i.type) && i.type !== "radical" && !started.has(i.id))
    .filter((i) => gatingPrerequisites(i).every((p) => learnedSlugs.has(p)))
    .sort(compareCurriculum)
    .slice(0, limit);
}
