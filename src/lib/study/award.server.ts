import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { advanceStreak, localDate } from "./streak";

/** Add XP and count today towards the streak. Shared by SRS answers and lessons. */
export async function awardXp(
  supabase: SupabaseClient,
  userId: string,
  timezone: string,
  xpGained: number,
  now: Date = new Date(),
): Promise<{ xp: number; streak: number }> {
  const { data: game, error } = await supabase
    .from("gamification")
    .select("xp, streak, longest_streak, freezes, last_study_date")
    .eq("user_id", userId)
    .single();
  if (error) throw new Error(error.message);
  const streak = advanceStreak(game, localDate(now, timezone));
  const xp = game.xp + xpGained;
  const { error: saveError } = await supabase
    .from("gamification")
    .update({ ...streak, xp })
    .eq("user_id", userId);
  if (saveError) throw new Error(saveError.message);
  return { xp, streak: streak.streak };
}
