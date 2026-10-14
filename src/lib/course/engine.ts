import { compareCurriculum, type CurriculumItem } from "@/lib/study/curriculum";

// The adaptive course: turns "what haven't I learned yet?" into short units
// that belong together, level by level up to the learner's target (N5–N2
// for now).
//
// A unit is built around kanji: an unlearned kanji, its parts first if they
// are new too, then the words that use it, so each new word is readable with
// kanji you've just met. When a level's kanji are done, the rest of its words
// are grouped by a kanji or topic they share. Kana come first of all.
//
// It adapts to the learner: recent review accuracy sets the unit size, a big
// review backlog shrinks it, and words they keep missing come back as
// refreshers in units that share a kanji with them.

export const COURSE_LEVELS = ["N5", "N4", "N3", "N2"] as const;
export type CourseLevel = (typeof COURSE_LEVELS)[number];

/** Item types the course teaches. Grammar arrives through lessons. */
export const COURSE_TYPES = ["kana", "radical", "kanji", "word"];

export interface CourseItem extends CurriculumItem {
  meaning: string;
}

export interface LearnerState {
  /** Items with a recognition card (started). */
  started: Set<string>;
  /** Slugs whose recognition card has reached Review. */
  learnedSlugs: Set<string>;
  /** Grades (1–4) of recent reviews, newest first. */
  recentGrades: number[];
  /** Reviews due now. */
  dueCount: number;
  /** Started items that keep slipping: lapses or recent mistakes, worst first. */
  struggling: { itemId: string; weight: number }[];
}

export interface Unit {
  /** Stable id from its items, so the unit page can be linked. */
  key: string;
  title: string;
  level: string;
  /** New items, in teaching order (parts → kanji → words). */
  items: CourseItem[];
  /** Already-started items that keep slipping, shown again. */
  refresh: CourseItem[];
}

export interface Adaptation {
  size: number;
  /** Plain-English reasons the size was chosen. */
  reasons: string[];
  accuracy: number | null;
}

export interface LevelProgress {
  level: CourseLevel;
  total: number;
  started: number;
  learned: number;
}

const KANJI = /[㐀-鿿々]/g;
const kanjiOf = (term: string) => [...new Set(term.match(KANJI) ?? [])];
const NUMERALS = /^[一二三四五六七八九十百千万何]/;
const counter = (w: { term: string }, k: string) => (NUMERALS.test(w.term) && !NUMERALS.test(k) ? 1 : 0);

/** Levels the course covers for a target: N5 up to the target, capped at N2 for now. */
export function courseLevels(target: string): CourseLevel[] {
  const at = COURSE_LEVELS.indexOf(target as CourseLevel);
  return COURSE_LEVELS.slice(0, at === -1 ? (target === "N1" ? COURSE_LEVELS.length : 1) : at + 1);
}

const BASE_SIZE = 8;

/** Unit size from recent accuracy and the review backlog. */
export function adapt(state: Pick<LearnerState, "recentGrades" | "dueCount">): Adaptation {
  const graded = state.recentGrades.slice(0, 60);
  const accuracy = graded.length >= 10 ? graded.filter((g) => g >= 2).length / graded.length : null;
  const reasons: string[] = [];
  let size = BASE_SIZE;
  if (accuracy !== null && accuracy < 0.75) {
    size = 5;
    reasons.push(`You're getting ${Math.round(accuracy * 100)}% of reviews right lately, so units are smaller until that climbs.`);
  } else if (accuracy !== null && accuracy >= 0.9) {
    size = 10;
    reasons.push(`You're getting ${Math.round(accuracy * 100)}% of reviews right, so units are bigger.`);
  }
  if (state.dueCount > 150) {
    size = Math.min(size, 5);
    reasons.push(`${state.dueCount} reviews are waiting, so units stay small: clearing reviews first locks in what you've learned.`);
  }
  if (!reasons.length) reasons.push(accuracy === null ? "Standard unit size until there's enough review history to adapt." : "Your accuracy is steady, so units are standard size.");
  return { size, reasons, accuracy };
}

/** Progress through each course level's kanji and words. */
export function levelProgress(items: CourseItem[], levels: CourseLevel[], state: Pick<LearnerState, "started" | "learnedSlugs">): LevelProgress[] {
  return levels.map((level) => {
    const at = items.filter((i) => i.jlpt_level === level && (i.type === "kanji" || i.type === "word"));
    return {
      level,
      total: at.length,
      started: at.filter((i) => state.started.has(i.id)).length,
      learned: at.filter((i) => state.learnedSlugs.has(i.slug)).length,
    };
  });
}

/** preN5 (kana) sits below N5; N1 and anything unknown sit above every course level. */
const levelRank = (level: string) => {
  if (level === "preN5") return -1;
  const at = COURSE_LEVELS.indexOf(level as CourseLevel);
  return at === -1 ? 99 : at;
};

interface Pools {
  /** Unstarted, in curriculum order. */
  fresh: CourseItem[];
  bySlug: Map<string, CourseItem>;
  kanjiByChar: Map<string, CourseItem>;
  /** Unstarted words by each kanji they contain. */
  wordsByKanji: Map<string, CourseItem[]>;
}

function pools(items: CourseItem[], levels: CourseLevel[], started: Set<string>): Pools {
  const maxRank = levelRank(levels[levels.length - 1]);
  const inScope = (i: CourseItem) => COURSE_TYPES.includes(i.type) && levelRank(i.jlpt_level) <= maxRank;
  const fresh = items.filter((i) => inScope(i) && !started.has(i.id)).sort(compareCurriculum);
  const kanjiByChar = new Map(items.filter((i) => i.type === "kanji").map((k) => [k.term, k]));
  const wordsByKanji = new Map<string, CourseItem[]>();
  for (const w of fresh.filter((i) => i.type === "word")) {
    for (const k of kanjiOf(w.term)) wordsByKanji.set(k, [...(wordsByKanji.get(k) ?? []), w]);
  }
  return { fresh, bySlug: new Map(items.map((i) => [i.slug, i])), kanjiByChar, wordsByKanji };
}

/**
 * The next `count` units. Each takes up to `size` new items; units after the
 * first assume the earlier ones are done, so the plan reads as a short
 * course outline.
 */
export function planUnits(items: CourseItem[], target: string, state: LearnerState, opts: { size?: number; count?: number } = {}): Unit[] {
  const levels = courseLevels(target);
  const size = opts.size ?? adapt(state).size;
  const count = opts.count ?? 3;
  const started = new Set(state.started);
  const learned = new Set(state.learnedSlugs);
  const byId = new Map(items.map((i) => [i.id, i]));
  const struggling = state.struggling.map((s) => byId.get(s.itemId)).filter((i): i is CourseItem => !!i);
  const usedRefresh = new Set<string>();

  const units: Unit[] = [];
  for (let n = 0; n < count; n++) {
    const p = pools(items, levels, started);
    const unit = nextUnit(p, size, started, learned);
    if (!unit) break;
    // Treat this unit as done so the next one follows on from it.
    for (const i of unit.items) {
      started.add(i.id);
      learned.add(i.slug);
    }
    unit.refresh = pickRefresh(struggling, unit.items, usedRefresh);
    units.push(unit);
  }
  return units;
}

/** Up to three struggling items, preferring ones that share a kanji with the unit. */
function pickRefresh(struggling: CourseItem[], unitItems: CourseItem[], used: Set<string>): CourseItem[] {
  const unitKanji = new Set(unitItems.flatMap((i) => kanjiOf(i.term)));
  const shares = (i: CourseItem) => kanjiOf(i.term).some((k) => unitKanji.has(k));
  const pick = [...struggling.filter((i) => shares(i)), ...struggling.filter((i) => !shares(i))]
    .filter((i) => !used.has(i.id))
    .slice(0, 3);
  for (const i of pick) used.add(i.id);
  return pick;
}

function nextUnit(p: Pools, size: number, started: Set<string>, learned: Set<string>): Unit | null {
  // Radicals are taught as parts of the kanji that use them, never on their own.
  const first = p.fresh.find((i) => i.type !== "radical");
  if (!first) return null;
  const unitKey = (items: CourseItem[]) => items.map((i) => i.slug).join("+");

  // Kana (and anything below N5) in curriculum order: one row at a time.
  if (first.type === "kana") {
    const kana = p.fresh.filter((i) => i.type === "kana").slice(0, size);
    return { key: unitKey(kana), title: `Kana: ${kana.map((k) => k.term).join(" ")}`, level: "Kana", items: kana, refresh: [] };
  }

  const level = first.jlpt_level;
  const picked: CourseItem[] = [];
  const anchors: string[] = [];
  const has = (i: CourseItem) => picked.some((x) => x.id === i.id);
  const known = (k: string) => learned.has(p.kanjiByChar.get(k)?.slug ?? "") || picked.some((x) => x.type === "kanji" && x.term === k);
  const readable = (w: CourseItem) => kanjiOf(w.term).every(known);
  const room = () => size - picked.length;
  const add = (i: CourseItem) => {
    if (!has(i) && !started.has(i.id) && room() > 0) picked.push(i);
  };
  /** Words that use kanji `k`, at or below this level, readable now, shortest first. */
  const wordsWith = (k: string) =>
    (p.wordsByKanji.get(k) ?? [])
      .filter((w) => levelRank(w.jlpt_level) <= levelRank(level) && !has(w) && readable(w) && w.term !== k)
      // Counter words (七時, 三時…) go last unless the kanji is a number, so a unit isn't all counters.
      .sort((a, b) => counter(a, k) - counter(b, k) || a.term.length - b.term.length || compareCurriculum(a, b));
  /** A kanji with its unlearned parts first. */
  const teachKanji = (kanji: CourseItem) => {
    for (const slug of kanji.prerequisites) {
      const part = p.bySlug.get(slug);
      if (part && !learned.has(slug)) add(part);
    }
    add(kanji);
  };

  const kanjiLeft = p.fresh.filter((i) => i.type === "kanji" && i.jlpt_level === level);
  if (kanjiLeft.length) {
    // About two kanji per unit, each bringing up to three words that use it.
    for (const k of kanjiLeft) {
      if (room() < 2) break;
      teachKanji(k);
      if (!has(k)) continue;
      anchors.push(k.term);
      for (const w of wordsWith(k.term).slice(0, Math.min(3, room()))) add(w);
    }
  } else {
    // This level's kanji are done: group its remaining words by a kanji they share.
    const words = p.fresh.filter((i) => i.type === "word" && i.jlpt_level === level);
    const remainingWith = (k: string) => (p.wordsByKanji.get(k) ?? []).filter((w) => w.jlpt_level === level && !has(w)).length;
    while (room() > 0) {
      const lead = words.find((w) => !has(w) && readable(w)) ?? words.find((w) => !has(w));
      if (!lead) break;
      if (!readable(lead)) {
        // Its kanji belong to a higher level: teach them first.
        for (const k of kanjiOf(lead.term).filter((k) => !known(k))) {
          const kanji = p.kanjiByChar.get(k);
          if (kanji && !started.has(kanji.id)) teachKanji(kanji);
        }
        if (!readable(lead)) {
          add(lead); // no kanji item to teach: take the word as it is
          continue;
        }
      }
      const shared = kanjiOf(lead.term).sort((a, b) => remainingWith(b) - remainingWith(a))[0];
      if (shared) {
        anchors.push(shared);
        for (const w of [lead, ...wordsWith(shared).filter((w) => w.jlpt_level === level)]) add(w);
      } else {
        // Kana-only words: keep a topic together when there is one.
        const kin = lead.topic ? words.filter((w) => w.topic === lead.topic && !kanjiOf(w.term).length) : [];
        for (const w of [lead, ...kin]) add(w);
      }
    }
  }

  if (!picked.length) return null;
  // Parts, then kanji, then words.
  const rank = (i: CourseItem) => (i.type === "radical" ? 0 : i.type === "kanji" ? 1 : 2);
  const items = [...picked].sort((a, b) => rank(a) - rank(b));
  const topic = items.find((i) => i.topic)?.topic;
  const single = anchors.length === 1 ? p.kanjiByChar.get(anchors[0])?.meaning.split(/[,;]/)[0] : undefined;
  const title = anchors.length
    ? `${level} · ${[...new Set(anchors)].slice(0, 3).join("・")}${single ? ` (${single})` : ""}`
    : `${level} · ${topic ?? "words in kana"}`;
  return { key: unitKey(items), title, level, items, refresh: [] };
}
