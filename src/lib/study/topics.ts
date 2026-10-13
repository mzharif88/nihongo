import { compareCurriculum, SRS_TYPES, type CurriculumItem } from "./curriculum";

// "Topic of the day": the learner picks where today's new items come from.
// Reviews are unaffected; only the choice of new items changes.

export interface Topic {
  id: string;
  label: string;
  group: "Scripts" | "Kanji" | "Words by level" | "Words by topic";
  /** Unstarted items left in this topic. */
  remaining: number;
}

const LEVELS = ["N5", "N4", "N3", "N2", "N1"];
export const TOPIC_ID = /^(kana:(hiragana|katakana)|kanji:N[1-5]|words:N[1-5]|topic:.{1,60})$/;

/** Does an item belong to a topic id? */
export function inTopic(item: CurriculumItem, topicId: string): boolean {
  const [kind, value] = [topicId.slice(0, topicId.indexOf(":")), topicId.slice(topicId.indexOf(":") + 1)];
  switch (kind) {
    case "kana":
      return item.type === "kana" && item.tags.includes(value);
    case "kanji":
      return item.type === "kanji" && item.jlpt_level === value;
    case "words":
      return item.type === "word" && item.jlpt_level === value;
    case "topic":
      return item.type === "word" && item.topic === value;
    default:
      return false;
  }
}

/** Every topic that has content, with how many items are still unstarted. */
export function listTopics(items: CurriculumItem[], started: Set<string>): Topic[] {
  const remaining = (topicId: string) => items.filter((i) => !started.has(i.id) && inTopic(i, topicId)).length;
  const fixed: Omit<Topic, "remaining">[] = [
    { id: "kana:hiragana", label: "Hiragana", group: "Scripts" },
    { id: "kana:katakana", label: "Katakana", group: "Scripts" },
    ...LEVELS.map((l) => ({ id: `kanji:${l}`, label: `${l} kanji`, group: "Kanji" as const })),
    ...LEVELS.map((l) => ({ id: `words:${l}`, label: `${l} words`, group: "Words by level" as const })),
  ];
  const named = [...new Set(items.filter((i) => i.type === "word" && i.topic).map((i) => i.topic!))]
    .sort()
    .map((t) => ({ id: `topic:${t}`, label: t, group: "Words by topic" as const }));
  return [...fixed, ...named]
    .map((t) => ({ ...t, remaining: remaining(t.id) }))
    .filter((t) => items.some((i) => inTopic(i, t.id)));
}

/**
 * New items for a chosen topic, in curriculum order. A topic item whose
 * prerequisites aren't learned yet (a kanji's radicals) brings those
 * prerequisites in first, so picking "N5 kanji" works from day one.
 */
export function pickTopicItems<T extends CurriculumItem>(
  candidates: T[],
  topicId: string,
  started: Set<string>,
  learnedSlugs: Set<string>,
  limit: number,
): T[] {
  if (limit <= 0) return [];
  const bySlug = new Map(candidates.map((c) => [c.slug, c]));
  const picked = new Map<string, T>();
  const topicItems = candidates
    .filter((i) => SRS_TYPES.includes(i.type) && !started.has(i.id) && inTopic(i, topicId))
    .sort(compareCurriculum);

  for (const item of topicItems) {
    if (picked.size >= limit) break;
    const missing = item.prerequisites.filter((p) => !learnedSlugs.has(p));
    if (missing.length === 0) {
      picked.set(item.id, item);
      continue;
    }
    for (const slug of missing) {
      const prereq = bySlug.get(slug);
      if (prereq && !started.has(prereq.id) && prereq.prerequisites.every((p) => learnedSlugs.has(p)) && picked.size < limit) {
        picked.set(prereq.id, prereq);
      }
    }
  }
  return [...picked.values()];
}
