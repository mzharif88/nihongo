import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { gradeFromResult, newCard, review, type UserItemCard } from "@/lib/srs/fsrs";
import { RECALL_TYPES, type CardType } from "./cards";

/** How long after recognition is learned the recall card first comes due. */
const RECALL_DELAY_MS = 24 * 60 * 60 * 1000;

const FSRS_COLUMNS =
  "due, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses, fsrs_state, last_review";

export interface Answer {
  itemId: string;
  itemType: string;
  cardType: CardType;
  correct: boolean;
  msTaken: number;
  given?: string;
  source: "srs" | "course";
}

/**
 * Apply one answer: reschedule the FSRS card (starting it if new), append to
 * reviews, log a mistake when wrong, and unlock the recall card when
 * recognition is learned. Shared by SRS study and course units.
 */
export async function applyAnswer(supabase: SupabaseClient, userId: string, a: Answer, now: Date): Promise<UserItemCard> {
  const msTaken = Math.max(0, Math.min(Math.round(a.msTaken), 600_000));
  const { data: existing, error: loadError } = await supabase
    .from("user_items")
    .select(FSRS_COLUMNS)
    .eq("user_id", userId)
    .eq("item_id", a.itemId)
    .eq("card_type", a.cardType)
    .maybeSingle<UserItemCard>();
  if (loadError) throw new Error(loadError.message);

  const grade = gradeFromResult(a.correct, msTaken);
  const next = review(existing ?? newCard(now), grade, now);
  const { error: saveError } = await supabase
    .from("user_items")
    .upsert({ user_id: userId, item_id: a.itemId, card_type: a.cardType, ...next });
  if (saveError) throw new Error(saveError.message);

  const writes = [
    supabase.from("reviews").insert({
      item_id: a.itemId,
      card_type: a.cardType,
      grade,
      ms_taken: msTaken,
      source: a.source,
      fsrs_state: next.fsrs_state,
    }),
  ];
  if (!a.correct) {
    writes.push(
      supabase.from("mistakes").insert({
        item_id: a.itemId,
        source: a.source,
        detail: { card_type: a.cardType, given: a.given?.slice(0, 200) ?? null },
      }),
    );
  }
  if (a.cardType === "recognition" && next.fsrs_state === 2 && RECALL_TYPES.includes(a.itemType)) {
    writes.push(
      supabase.from("user_items").upsert(
        // Start the reverse card tomorrow, not straight after: same-day repeats of a word just learned add little.
        { user_id: userId, item_id: a.itemId, card_type: "recall", ...newCard(new Date(now.getTime() + RECALL_DELAY_MS)) },
        { ignoreDuplicates: true },
      ),
    );
  }
  for (const { error } of await Promise.all(writes)) if (error) throw new Error(error.message);
  return next;
}
