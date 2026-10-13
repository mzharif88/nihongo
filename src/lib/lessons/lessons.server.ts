import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ITEM_COLUMNS } from "@/lib/study/session.server";
import type { StudyItem } from "@/lib/study/cards";
import { summarizeLessons, type LessonProgress, type LessonRow, type LessonSummary } from "./lessons";

const SUMMARY_COLUMNS = "id, slug, jlpt_level, position, title, situation, item_slugs";

/** Every live lesson in order, with the learner's progress and lock state. */
export async function loadLessonList(supabase: SupabaseClient, userId: string): Promise<LessonSummary[]> {
  const [{ data: lessons, error }, { data: progress, error: progressError }] = await Promise.all([
    supabase.from("lessons").select(SUMMARY_COLUMNS).eq("status", "live"),
    supabase.from("lesson_progress").select("lesson_id, score, max_score, attempts, completed_at").eq("user_id", userId),
  ]);
  if (error) throw new Error(error.message);
  if (progressError) throw new Error(progressError.message);
  return summarizeLessons(lessons as LessonRow[], progress as LessonProgress[]);
}

export interface LessonDetail {
  lesson: LessonRow;
  summary: LessonSummary;
  /** The lesson's items in the order it lists them (only the live ones). */
  items: StudyItem[];
  grammar: StudyItem | null;
}

/** One lesson with its items and grammar point, or null if it doesn't exist or isn't live. */
export async function loadLesson(supabase: SupabaseClient, userId: string, slug: string): Promise<LessonDetail | null> {
  const [list, { data: lesson, error }] = await Promise.all([
    loadLessonList(supabase, userId),
    supabase.from("lessons").select("*").eq("slug", slug).eq("status", "live").maybeSingle<LessonRow>(),
  ]);
  if (error) throw new Error(error.message);
  const summary = list.find((l) => l.slug === slug);
  if (!lesson || !summary) return null;

  const slugs = [...lesson.item_slugs, ...(lesson.grammar_slug ? [lesson.grammar_slug] : [])];
  const { data: rows, error: itemsError } = await supabase
    .from("items")
    .select(ITEM_COLUMNS)
    .in("slug", slugs)
    .eq("status", "live");
  if (itemsError) throw new Error(itemsError.message);
  const bySlug = new Map((rows as unknown as StudyItem[]).map((r) => [r.slug, r]));
  return {
    lesson,
    summary,
    items: lesson.item_slugs.map((s) => bySlug.get(s)).filter((i): i is StudyItem => !!i),
    grammar: lesson.grammar_slug ? (bySlug.get(lesson.grammar_slug) ?? null) : null,
  };
}
