import starterJson from "../../../content/newcomer/starter.json";

// The starter library: everyday phrases by topic, with furigana and kana
// added at build time (npm run build:newcomer).

export interface StarterPhrase {
  slug: string;
  stage: number;
  en: string;
  ms: string;
  jp: string;
  reading: string;
  kana: string;
}

export interface StarterTopic {
  slug: string;
  title: string;
  description: string;
  phrases: StarterPhrase[];
}

export const STARTER: StarterTopic[] = (starterJson as unknown as { topics: StarterTopic[] }).topics;
export const starterTopic = (slug: string) => STARTER.find((t) => t.slug === slug) ?? null;

/** Children's speech grows in this order; the stage names shown to the learner. */
export const STAGES = [
  "",
  "Single chunks",
  "Two-part phrases",
  "Frames with a slot",
  "Questions & answers",
  "Past & future",
  "Two ideas joined",
  "Telling a story",
];
