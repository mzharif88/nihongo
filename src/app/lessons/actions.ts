"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { lessonXp, nextLessonSlug, scoreChecks, type CheckResult } from "@/lib/lessons/lessons";
import { loadLesson, loadLessonList } from "@/lib/lessons/lessons.server";
import { newCard } from "@/lib/srs/fsrs";
import { awardXp } from "@/lib/study/award.server";
import { SRS_TYPES } from "@/lib/study/curriculum";

export interface LessonResult extends CheckResult {
  xpGained: number;
  streak: number;
  /** Items from this lesson newly added to the learner's reviews. */
  added: number;
  nextSlug: string | null;
}

/**
 * Finish a lesson: score the quick checks on the server, record progress,
 * put the lesson's items into SRS, log wrong checks as mistakes, and award
 * XP and the streak.
 */
export async function completeLesson(slug: string, answers: (number | null)[]): Promise<LessonResult> {
  const { supabase, user, profile } = await requireUser();
  const detail = await loadLesson(supabase, user.id, slug);
  if (!detail) throw new Error("Lesson not found.");
  if (detail.summary.state === "locked") throw new Error("Finish the earlier lessons first.");
  const { lesson, summary, items, grammar } = detail;
  const now = new Date();

  const result = scoreChecks(lesson.checks, Array.isArray(answers) ? answers.slice(0, lesson.checks.length) : []);
  const previous = summary.progress;
  const { error: progressError } = await supabase.from("lesson_progress").upsert({
    user_id: user.id,
    lesson_id: lesson.id,
    score: Math.max(result.score, previous?.score ?? 0),
    max_score: result.max,
    attempts: (previous?.attempts ?? 0) + 1,
    completed_at: now.toISOString(),
  });
  if (progressError) throw new Error(progressError.message);

  // Start recognition cards for the lesson's items; ones already in SRS keep their schedule.
  const srsItems = items.filter((i) => SRS_TYPES.includes(i.type));
  let added = 0;
  if (srsItems.length) {
    const { data, error } = await supabase
      .from("user_items")
      .upsert(
        srsItems.map((i) => ({ user_id: user.id, item_id: i.id, card_type: "recognition", ...newCard(now) })),
        { onConflict: "user_id,item_id,card_type", ignoreDuplicates: true },
      )
      .select("item_id");
    if (error) throw new Error(error.message);
    added = data.length;
  }

  const wrong = lesson.checks.flatMap((c, i) => (result.correct[i] ? [] : [{ c, i }]));
  if (wrong.length) {
    const { error } = await supabase.from("mistakes").insert(
      wrong.map(({ c, i }) => ({
        item_id: grammar?.id ?? null,
        source: "lesson",
        detail: { lesson: lesson.slug, check: i, prompt: c.prompt, given: c.options[answers[i] ?? -1] ?? null, answer: c.options[c.answer] },
      })),
    );
    if (error) throw new Error(error.message);
  }

  const xpGained = lessonXp(result, !previous);
  const { streak } = await awardXp(supabase, user.id, profile.timezone, xpGained, now);

  revalidatePath("/");
  revalidatePath("/lessons");
  revalidatePath("/situations");
  const list = await loadLessonList(supabase, user.id);
  const nextSlug = nextLessonSlug(list, slug);
  return { ...result, xpGained, streak, added, nextSlug };
}
