import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { comparePatterns, playable, type BuilderProgress, type PatternRow } from "./builder";

export interface PatternSummary {
  id: string;
  slug: string;
  jlpt_level: string;
  title: string;
  english: string | null;
  exerciseCount: number;
  progress: BuilderProgress | null;
}

const COLUMNS = "id, slug, jlpt_level, position, title, english, grammar_slug, notes, examples";

async function livePatterns(supabase: SupabaseClient): Promise<PatternRow[]> {
  const { data, error } = await supabase.from("sentence_patterns").select(COLUMNS).eq("status", "live");
  if (error) throw new Error(error.message);
  return (data as PatternRow[]).filter((p) => playable(p.examples).length > 0).sort(comparePatterns);
}

/** Live patterns that have builder exercises, in order, with the learner's best run. */
export async function loadPatternList(supabase: SupabaseClient, userId: string): Promise<PatternSummary[]> {
  const [patterns, { data: progress, error }] = await Promise.all([
    livePatterns(supabase),
    supabase.from("builder_progress").select("pattern_id, best_score, max_score, attempts").eq("user_id", userId),
  ]);
  if (error) throw new Error(error.message);
  const byPattern = new Map((progress as BuilderProgress[]).map((p) => [p.pattern_id, p]));
  return patterns.map((p) => ({
    id: p.id,
    slug: p.slug,
    jlpt_level: p.jlpt_level,
    title: p.title,
    english: p.english,
    exerciseCount: playable(p.examples).length,
    progress: byPattern.get(p.id) ?? null,
  }));
}

export interface PatternDetail {
  pattern: PatternRow;
  progress: BuilderProgress | null;
  /** The grammar point's meaning, for the hint panel. */
  grammar: { id: string; term: string; meaning: string } | null;
  nextSlug: string | null;
}

export async function loadPattern(supabase: SupabaseClient, userId: string, slug: string): Promise<PatternDetail | null> {
  const patterns = await livePatterns(supabase);
  const index = patterns.findIndex((p) => p.slug === slug);
  if (index < 0) return null;
  const pattern = { ...patterns[index], examples: playable(patterns[index].examples) };
  const [{ data: progress, error }, { data: grammar, error: grammarError }] = await Promise.all([
    supabase
      .from("builder_progress")
      .select("pattern_id, best_score, max_score, attempts")
      .eq("user_id", userId)
      .eq("pattern_id", pattern.id)
      .maybeSingle<BuilderProgress>(),
    pattern.grammar_slug
      ? supabase.from("items").select("id, term, meaning").eq("slug", pattern.grammar_slug).eq("status", "live").maybeSingle<{ id: string; term: string; meaning: string }>()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (error) throw new Error(error.message);
  if (grammarError) throw new Error(grammarError.message);
  return {
    pattern,
    progress: progress ?? null,
    grammar: grammar ?? null,
    nextSlug: patterns[index + 1]?.slug ?? null,
  };
}

