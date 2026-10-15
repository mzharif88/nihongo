import { compareCurriculum, gatingPrerequisites, SRS_TYPES, topicRank, type CurriculumItem } from "./curriculum";

// Topics: tap one on the home page to study just that topic (its due
// reviews, then its next new items). There is no daily limit.

export interface Topic {
  id: string;
  label: string;
  group: "Scripts" | "Radicals" | "Kanji" | "Words by level" | "Words by topic";
  /** Items in this topic. */
  total: number;
  /** Unstarted items left in this topic. */
  remaining: number;
  /** Cards from this topic due for review now. */
  due: number;
}

const LEVELS = ["N5", "N4", "N3", "N2", "N1"];
export const TOPIC_ID = /^(kana:(hiragana|katakana)|radicals:all|kanji:N[1-5]|words:N[1-5]|topic:.{1,60})$/;

/** Does an item belong to a topic id? */
export function inTopic(item: CurriculumItem, topicId: string): boolean {
  const [kind, value] = [topicId.slice(0, topicId.indexOf(":")), topicId.slice(topicId.indexOf(":") + 1)];
  switch (kind) {
    case "kana":
      return item.type === "kana" && item.tags.includes(value);
    case "radicals":
      return item.type === "radical";
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

/** Every topic that has content, with its size, unstarted items and due reviews. */
export function listTopics(items: CurriculumItem[], started: Set<string>, dueItemIds: Set<string> = new Set()): Topic[] {
  const fixed: Pick<Topic, "id" | "label" | "group">[] = [
    { id: "kana:hiragana", label: "Hiragana", group: "Scripts" },
    { id: "kana:katakana", label: "Katakana", group: "Scripts" },
    // Radicals are their own deck, never counted in a level's kanji.
    { id: "radicals:all", label: "All radicals", group: "Radicals" },
    ...LEVELS.map((l) => ({ id: `kanji:${l}`, label: `${l} kanji`, group: "Kanji" as const })),
    ...LEVELS.map((l) => ({ id: `words:${l}`, label: `${l} words`, group: "Words by level" as const })),
  ];
  const named = [...new Set(items.filter((i) => i.type === "word" && i.topic).map((i) => i.topic!))]
    .sort((a, b) => topicRank(a) - topicRank(b) || a.localeCompare(b))
    .map((t) => ({ id: `topic:${t}`, label: t, group: "Words by topic" as const }));
  return [...fixed, ...named]
    .map((t) => {
      const members = items.filter((i) => inTopic(i, t.id));
      return {
        ...t,
        total: members.length,
        remaining: members.filter((i) => !started.has(i.id)).length,
        due: members.filter((i) => dueItemIds.has(i.id)).length,
      };
    })
    .filter((t) => t.total > 0);
}

/**
 * New items for a chosen topic, in curriculum order. A topic item whose
 * prerequisites aren't learned yet brings those in first. A kanji's radicals
 * aren't prerequisites: they stay in the Radicals topic.
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
    const missing = gatingPrerequisites(item).filter((p) => !learnedSlugs.has(p));
    if (missing.length === 0) {
      picked.set(item.id, item);
      continue;
    }
    for (const slug of missing) {
      const prereq = bySlug.get(slug);
      if (prereq && !started.has(prereq.id) && gatingPrerequisites(prereq).every((p) => learnedSlugs.has(p)) && picked.size < limit) {
        picked.set(prereq.id, prereq);
      }
    }
  }
  return [...picked.values()];
}
