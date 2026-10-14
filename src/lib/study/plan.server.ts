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
  const [reviews, texts, builder, mock] = await Promise.all([
    count("reviews", "reviewed_at"),
    // Reading passages and listening sets share text_progress; split them by the text's kind.
    supabase
      .from("text_progress")
      .select("texts!inner(kind)")
      .eq("user_id", profile.id)
      .gte("completed_at", sinceIso)
      .then(({ data, error }) => {
        if (error) throw new Error(error.message);
        return (data as unknown as { texts: { kind: string } }[]).map((r) => r.texts.kind);
      }),
    count("builder_progress", "completed_at"),
    count("mock_attempts", "finished_at"),
  ]);
  const today = lessons.filter((l) => l.progress && Date.parse(l.progress.completed_at) >= since.getTime());
  return {
    reviews,
    reading: texts.filter((k) => k === "reading").length,
    listening: texts.filter((k) => k === "listening").length,
    builder,
    mock,
    lessons: today.filter((l) => !isSituation(l.slug)).length,
    situations: today.filter((l) => isSituation(l.slug)).length,
  };
}
