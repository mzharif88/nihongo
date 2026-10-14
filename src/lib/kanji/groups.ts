import families from "../../../content/kanji-groups/families.json";
import lookalikes from "../../../content/kanji-groups/lookalikes.json";
import { kanjiRank, KANJI_LEVELS } from "@/lib/kanji-levels";

// Kanji to learn side by side: look-alikes (hand-written, with what tells
// them apart) and families that share a part and a reading (generated).

export interface KanjiGroup {
  slug: string;
  kind: "lookalike" | "family";
  title: string;
  kanji: string[];
  /** The highest JLPT level among its kanji. */
  level: string;
  /** Look-alikes: what differs. Families: the shared part and reading. */
  difference: string;
  hints: Record<string, string>;
}

const levelOf = (kanji: string[]) => KANJI_LEVELS[Math.min(KANJI_LEVELS.length - 1, Math.max(...kanji.map(kanjiRank)))];

export const KANJI_GROUPS: KanjiGroup[] = [
  ...(lookalikes.groups as unknown as { slug: string; kanji: string[]; title: string; difference: string; hints: Record<string, string> }[]).map((g) => ({
    ...g,
    kind: "lookalike" as const,
    level: levelOf(g.kanji),
  })),
  ...(families.groups as unknown as { slug: string; part: string; reading: string; kanji: string[]; title: string; level: string }[]).map((g) => ({
    slug: g.slug,
    kind: "family" as const,
    title: g.title,
    kanji: g.kanji,
    level: g.level,
    difference: `Each one contains ${g.part} and is read ${g.reading}: the shared part is a hint to the sound.`,
    hints: {},
  })),
].sort((a, b) => KANJI_LEVELS.indexOf(a.level as never) - KANJI_LEVELS.indexOf(b.level as never));

export const groupBySlug = (slug: string) => KANJI_GROUPS.find((g) => g.slug === slug) ?? null;

/** Groups that share a kanji with `kanji` (for "often confused with" links). */
export const groupsWith = (kanji: string) => KANJI_GROUPS.filter((g) => g.kanji.includes(kanji));
