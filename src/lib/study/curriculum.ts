// Unlock order for new SRS items before lessons exist: kana first, then
// radicals, kanji (once their radicals are learned), words, then sentences.

export interface CurriculumItem {
  id: string;
  slug: string;
  type: string;
  jlpt_level: string;
  term: string;
  topic: string | null;
  tags: string[];
  prerequisites: string[];
}

const LEVEL_RANK: Record<string, number> = { preN5: 0, N5: 1, N4: 2, N3: 3, N2: 4, N1: 5 };

// Vocabulary topics in the order the old app taught them; unknown topics go last.
const TOPIC_ORDER = [
  "Greetings & Basics", "Numbers", "Family", "Food & Drink", "Time Expressions", "Daily Actions",
  "Places Around Town", "Transportation", "Shopping", "Money & Prices", "Time & Calendar", "Counters",
  "Colors & Appearance", "Adjectives", "Body Parts", "Weather & Nature", "Health", "Work & School",
  "Emotions", "Communication Verbs", "Movement Verbs", "Expressions", "Pets & Common", "Household Items",
  "Kitchen Items", "Clothes & Fashion", "Fruits & Veggies", "Home & Living", "Tech & Stationery",
  "Japanese Culture", "Tech & Modern Life", "Wild Animals", "Sea & Insects", "Farm & Domestic", "Words",
];

function stage(item: CurriculumItem): number {
  const has = (t: string) => item.tags.includes(t);
  if (item.type === "kana") {
    const script = has("katakana") ? 3 : 0;
    return script + (has("combo") ? 2 : has("dakuten") ? 1 : 0);
  }
  const typeStage: Record<string, number> = { radical: 6, kanji: 7, word: 8, sentence: 9 };
  return typeStage[item.type] ?? 99;
}

function topicRank(topic: string | null): number {
  const i = topic ? TOPIC_ORDER.indexOf(topic) : -1;
  return i === -1 ? TOPIC_ORDER.length : i;
}

/** Sort key: level, stage, topic, then character order (Unicode kana order is gojūon order). */
export function compareCurriculum(a: CurriculumItem, b: CurriculumItem): number {
  return (
    (LEVEL_RANK[a.jlpt_level] ?? 9) - (LEVEL_RANK[b.jlpt_level] ?? 9) ||
    stage(a) - stage(b) ||
    topicRank(a.topic) - topicRank(b.topic) ||
    (a.term < b.term ? -1 : a.term > b.term ? 1 : 0) ||
    a.slug.localeCompare(b.slug)
  );
}

/** Items that can be studied in SRS now (grammar points arrive with lessons). */
export const SRS_TYPES = ["kana", "radical", "kanji", "word", "sentence"];

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
    .filter((i) => SRS_TYPES.includes(i.type) && !started.has(i.id))
    .filter((i) => i.prerequisites.every((p) => learnedSlugs.has(p)))
    .sort(compareCurriculum)
    .slice(0, limit);
}

/** New cards per day scale with the daily time budget: 20 minutes → 10 new items. */
export function newItemsPerDay(dailyMinutes: number): number {
  return Math.max(3, Math.min(30, Math.round(dailyMinutes / 2)));
}
