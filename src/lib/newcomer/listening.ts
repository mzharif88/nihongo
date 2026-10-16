import listeningJson from "../../../content/newcomer/listening.json";

// Pre-input listening: short graded scenes heard before they're read.
// Listen first with no text, answer one gist question, then read the
// transcript with furigana. Built by npm run build:newcomer.

export interface SceneLine {
  speaker: "A" | "B";
  jp: string;
  reading: string;
  kana: string;
  en: string;
  ms: string;
}

export interface Scene {
  slug: string;
  topic: string;
  level: number;
  title: string;
  setting: string;
  lines: SceneLine[];
  question: { en: string; ms: string; options: { en: string; ms: string }[]; answer: number };
}

export interface SceneProgress {
  plays: number;
  gist_correct: boolean | null;
}

export const SCENES: Scene[] = (listeningJson as unknown as { scenes: Scene[] }).scenes;
export const scene = (slug: string) => SCENES.find((s) => s.slug === slug) ?? null;

export const LEVELS = ["", "First words", "Short exchanges", "Everyday talk", "Longer listening"];

/** Plays that open the next level even without the gist right: hearing it enough counts too. */
const PLAYS_TO_PASS = 3;

/** A scene is done once its gist was caught, or after enough listens. */
export const sceneDone = (p: SceneProgress | undefined) => !!p && (p.gist_correct === true || p.plays >= PLAYS_TO_PASS);

/**
 * Whether a scene is open: level 1 always; a higher level once the level
 * below in the same topic is done (any topic's level 4 waits on its level 3).
 */
export function sceneOpen(s: Pick<Scene, "topic" | "level">, progress: Map<string, SceneProgress>, scenes: Scene[] = SCENES): boolean {
  if (s.level <= 1) return true;
  const below = scenes.filter((x) => x.topic === s.topic && x.level === s.level - 1);
  return below.length === 0 || below.every((x) => sceneDone(progress.get(x.slug)));
}

/** The scene to suggest next: the first open, unfinished one, lowest level first. */
export function nextScene(progress: Map<string, SceneProgress>, scenes: Scene[] = SCENES): Scene | null {
  const open = scenes.filter((s) => sceneOpen(s, progress, scenes) && !sceneDone(progress.get(s.slug)));
  return open.sort((a, b) => a.level - b.level)[0] ?? null;
}
