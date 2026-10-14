import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { QuestionRow } from "@/lib/mock/mock";

export interface TextRow {
  id: string;
  slug: string;
  jlpt_level: string;
  title: string;
  body: string;
}

export interface TextSummary extends Omit<TextRow, "body"> {
  questionCount: number;
  progress: { best_score: number; max_score: number; attempts: number } | null;
}

const rank = ["preN5", "N5", "N4", "N3", "N2", "N1"];

/** Live reading passages in level order with the learner's best score. */
export async function loadReadingList(supabase: SupabaseClient, userId: string): Promise<TextSummary[]> {
  const [{ data: texts, error }, { data: questions, error: qError }, { data: progress, error: pError }] = await Promise.all([
    supabase.from("texts").select("id, slug, jlpt_level, title").eq("kind", "reading").eq("status", "live"),
    supabase.from("questions").select("text_slug").eq("status", "live").not("text_slug", "is", null),
    supabase.from("text_progress").select("text_id, best_score, max_score, attempts").eq("user_id", userId),
  ]);
  if (error) throw new Error(error.message);
  if (qError) throw new Error(qError.message);
  if (pError) throw new Error(pError.message);
  const counts = new Map<string, number>();
  for (const q of questions as { text_slug: string }[]) counts.set(q.text_slug, (counts.get(q.text_slug) ?? 0) + 1);
  const byText = new Map((progress as ({ text_id: string } & TextSummary["progress"] & object)[]).map((p) => [p.text_id, p]));
  return (texts as Omit<TextRow, "body">[])
    .map((t) => ({ ...t, questionCount: counts.get(t.slug) ?? 0, progress: byText.get(t.id) ?? null }))
    .sort((a, b) => rank.indexOf(a.jlpt_level) - rank.indexOf(b.jlpt_level) || a.slug.localeCompare(b.slug));
}

export async function loadReading(supabase: SupabaseClient, userId: string, slug: string) {
  const { data: text, error } = await supabase
    .from("texts")
    .select("id, slug, jlpt_level, title, body")
    .eq("slug", slug)
    .eq("kind", "reading")
    .eq("status", "live")
    .maybeSingle<TextRow>();
  if (error) throw new Error(error.message);
  if (!text) return null;
  const [{ data: questions, error: qError }, { data: progress, error: pError }] = await Promise.all([
    supabase
      .from("questions")
      .select("id, slug, position, section, part, passage, prompt, options, answer, explanation, item_slugs")
      .eq("text_slug", slug)
      .eq("status", "live")
      .order("position"),
    supabase.from("text_progress").select("best_score, max_score, attempts").eq("user_id", userId).eq("text_id", text.id).maybeSingle(),
  ]);
  if (qError) throw new Error(qError.message);
  if (pError) throw new Error(pError.message);
  return { text, questions: questions as QuestionRow[], progress: progress as TextSummary["progress"] };
}
