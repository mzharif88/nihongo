"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { newCard } from "@/lib/srs/fsrs";
import { lessonXp, scoreChecks, type QuickCheck } from "@/lib/lessons/lessons";
import { SRS_TYPES } from "@/lib/study/curriculum";
import { advanceStreak, localDate } from "@/lib/study/streak";

export interface LessonResult {
  correct: number;
  total: number;
  xp: number;
  streak: number;
  cardsAdded: number;
}

/**
 * Finish a lesson: score the quick checks server-side, record progress, add
 * the lesson's items to the SRS deck (due now, so they show up in today's
 * reviews), and update XP and the streak.
 */
export async function completeLesson(lessonId: string, picks: number[]): Promise<LessonResult> {
  const { supabase, user, profile } = await requireUser();
  const now = new Date();

  const [{ data: lesson, error: lessonError }, { data: previous, error: progressError }] = await Promise.all([
    supabase
      .from("lessons")
      .select("id, item_slugs, checks")
      .eq("id", lessonId)
      .eq("status", "live")
      .single<{ id: string; item_slugs: string[]; checks: QuickCheck[] }>(),
    supabase.from("lesson_progress").select("lesson_id").eq("user_id", user.id).eq("lesson_id", lessonId).maybeSingle(),
  ]);
  if (lessonError) throw new Error(lessonError.message);
  if (progressError) throw new Error(progressError.message);

  const { correct, total } = scoreChecks(lesson.checks, picks);
  const firstTime = !previous;

  const { error: saveError } = await supabase.from("lesson_progress").upsert({
    user_id: user.id,
    lesson_id: lesson.id,
    checks_correct: correct,
    checks_total: total,
    ...(firstTime ? { completed_at: now.toISOString() } : {}),
  });
  if (saveError) throw new Error(saveError.message);

  let cardsAdded = 0;
  if (lesson.item_slugs.length) {
    const { data: items, error: itemsError } = await supabase
      .from("items")
      .select("id")
      .eq("status", "live")
      .in("type", SRS_TYPES)
      .in("slug", lesson.item_slugs);
    if (itemsError) throw new Error(itemsError.message);
    if (items.length) {
      const { data: added, error: cardsError } = await supabase
        .from("user_items")
        .upsert(
          items.map((i) => ({ user_id: user.id, item_id: i.id, card_type: "recognition", ...newCard(now) })),
          { ignoreDuplicates: true },
        )
        .select("item_id");
      if (cardsError) throw new Error(cardsError.message);
      cardsAdded = added?.length ?? 0;
    }
  }

  const { data: game, error: gameError } = await supabase
    .from("gamification")
    .select("xp, streak, longest_streak, freezes, last_study_date")
    .eq("user_id", user.id)
    .single();
  if (gameError) throw new Error(gameError.message);
  const streak = advanceStreak(game, localDate(now, profile.timezone));
  const gained = lessonXp(firstTime);
  const { error: gameSaveError } = await supabase
    .from("gamification")
    .update({ ...streak, xp: game.xp + gained })
    .eq("user_id", user.id);
  if (gameSaveError) throw new Error(gameSaveError.message);

  revalidatePath("/");
  revalidatePath("/lessons");
  return { correct, total, xp: gained, streak: streak.streak, cardsAdded };
}
