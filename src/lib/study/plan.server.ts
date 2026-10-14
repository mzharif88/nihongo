import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/auth";
import { isSituation, type LessonSummary } from "@/lib/lessons/lessons";
import type { TodayDone } from "./plan";
import { startOfLocalDay } from "./streak";

/** What the learner finished since local midnight. Lessons come from the list the page already loaded. */
export async function loadTodayDone(
  supabase: SupabaseClient,
  profile: Profile,
  lessons: LessonSummary[],
  now = new Date(),
): Promise<TodayDone> {
  const since = startOfLocalDay(now, profile.timezone);
  const sinceIso = since.toISOString();
  const count = async (table: string, column: string) => {
    const { count, error } = await supabase
      .from(table)
      .select("*", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .gte(column, sinceIso);
    if (error) throw new Error(error.message);
    return count ?? 0;
  };
  const [reviews, reading, builder, mock] = await Promise.all([
    count("reviews", "reviewed_at"),
    count("text_progress", "completed_at"),
    count("builder_progress", "completed_at"),
    count("mock_attempts", "finished_at"),
  ]);
  const today = lessons.filter((l) => l.progress && Date.parse(l.progress.completed_at) >= since.getTime());
  return {
    reviews,
    reading,
    builder,
    mock,
    listening: 0,
    lessons: today.filter((l) => !isSituation(l.slug)).length,
    situations: today.filter((l) => isSituation(l.slug)).length,
  };
}
