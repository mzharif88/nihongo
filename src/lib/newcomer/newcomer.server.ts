import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Priority, RecallPhrase } from "./recall";
import type { SceneProgress } from "./listening";
import { STARTER, type StarterTopic } from "./starter";

export type PhraseRow = {
  id: string;
  source: string;
  source_lang: "en" | "ms";
  meaning: string;
  jp: string;
  reading: string;
  kana: string;
  priority: Priority;
  right_count: number;
  wrong_count: number;
  streak: number;
  due_at: string;
  last_reviewed_at: string | null;
  created_at: string;
  /** Dictionary words the phrase uses; they come first in Study everything. */
  words: string[];
};
type ProgressRow = { phrase_slug: string; right_count: number; wrong_count: number; streak: number; due_at: string; last_reviewed_at: string | null };

/** A starter phrase as a recall item also carries its Malay meaning, so the page can show either. */
export type StarterRecallPhrase = RecallPhrase & { meaningMs: string; stage: number };

export const PHRASE_COLUMNS = "id, source, source_lang, meaning, jp, reading, kana, priority, right_count, wrong_count, streak, due_at, last_reviewed_at, created_at, words";

export async function loadMyPhrases(supabase: SupabaseClient): Promise<PhraseRow[]> {
  const { data, error } = await supabase
    .from("newcomer_phrases")
    .select(PHRASE_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as unknown as PhraseRow[];
}

export const mineAsRecall = (p: PhraseRow): RecallPhrase => ({
  key: `mine:${p.id}`,
  meaning: p.meaning,
  meaningLang: p.source_lang,
  jp: p.jp,
  reading: p.reading,
  kana: p.kana,
  priority: p.priority,
  right: p.right_count,
  wrong: p.wrong_count,
  streak: p.streak,
  due: p.due_at,
});

export async function loadStarterProgress(supabase: SupabaseClient): Promise<Map<string, ProgressRow>> {
  const { data, error } = await supabase.from("newcomer_progress").select("phrase_slug, right_count, wrong_count, streak, due_at, last_reviewed_at");
  if (error) throw new Error(error.message);
  return new Map((data as ProgressRow[]).map((r) => [r.phrase_slug, r]));
}

/** Share of a topic's open phrases answered right last time that unlocks the next stage. */
const UNLOCK_SHARE = 0.7;

/**
 * The stages open in a topic: the first two from the start, then one more
 * each time 70% of the open phrases were answered right last time. So the
 * topic grows from single chunks to longer sentences as the learner does.
 */
export function openStage(topic: StarterTopic, progress: Map<string, Pick<ProgressRow, "streak">>): number {
  const max = Math.max(...topic.phrases.map((p) => p.stage), 1);
  let stage = Math.min(2, max);
  while (stage < max) {
    const open = topic.phrases.filter((p) => p.stage <= stage);
    const known = open.filter((p) => (progress.get(p.slug)?.streak ?? 0) > 0).length;
    if (known < open.length * UNLOCK_SHARE) break;
    stage++;
  }
  return stage;
}

export function starterRecall(topic: StarterTopic, progress: Map<string, ProgressRow>, now = new Date()): StarterRecallPhrase[] {
  const stage = openStage(topic, progress);
  return topic.phrases
    .filter((p) => p.stage <= stage)
    .map((p) => {
      const r = progress.get(p.slug);
      return {
        key: `starter:${p.slug}`,
        meaning: p.en,
        meaningMs: p.ms,
        meaningLang: "en" as const,
        jp: p.jp,
        reading: p.reading,
        kana: p.kana,
        priority: "normal" as const,
        right: r?.right_count ?? 0,
        wrong: r?.wrong_count ?? 0,
        streak: r?.streak ?? 0,
        due: r?.due_at ?? now.toISOString(),
        stage: p.stage,
      };
    });
}

export const starterTopics = () => STARTER;

export async function loadListening(supabase: SupabaseClient): Promise<Map<string, SceneProgress>> {
  const { data, error } = await supabase.from("newcomer_listening").select("scene_slug, plays, gist_correct");
  if (error) throw new Error(error.message);
  return new Map((data as (SceneProgress & { scene_slug: string })[]).map((r) => [r.scene_slug, { plays: r.plays, gist_correct: r.gist_correct }]));
}
