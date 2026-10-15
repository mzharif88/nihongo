import data from "../../../content/particles/particles.json";

// Particle practice: hand-written cards pairing words with the particle they
// take (電車に乗る, 公園で遊ぶ), grouped by particle.

export interface ParticleCard {
  /** Ruby markup before and after the blank; the full sentence is before + answer + after. */
  before: string;
  after: string;
  answer: string;
  options: string[];
  en: string;
  why: string;
}

export interface ParticleGroup {
  slug: string;
  particle: string;
  romaji: string;
  level: string;
  title: string;
  uses: { label: string; note: string; example: string }[];
  cards: ParticleCard[];
}

export const PARTICLE_GROUPS = (data as unknown as { groups: ParticleGroup[] }).groups;

/** A practice set mixing every particle. */
export const MIXED_SLUG = "mixed";

export function particleGroup(slug: string): ParticleGroup | null {
  if (slug === MIXED_SLUG) {
    return {
      slug: MIXED_SLUG,
      particle: "は・が・を・に…",
      romaji: "mixed",
      level: "N5",
      title: "All particles mixed",
      uses: [],
      cards: PARTICLE_GROUPS.flatMap((g) => g.cards),
    };
  }
  return PARTICLE_GROUPS.find((g) => g.slug === slug) ?? null;
}

/** localStorage key for a group's best score. */
export const bestKey = (slug: string) => `particles:best:${slug}`;
