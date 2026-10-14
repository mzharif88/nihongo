"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { gradeFromResult, newCard, review, type UserItemCard } from "@/lib/srs/fsrs";
import { RECALL_TYPES, type CardType } from "@/lib/study/cards";
import { awardXp } from "@/lib/study/award.server";
import { XP_CORRECT, XP_WRONG } from "@/lib/study/streak";

export interface AnswerInput {
  itemId: string;
  cardType: CardType;
  correct: boolean;
  msTaken: number;
  given?: string;
}

export interface AnswerResult {
  due: string;
  fsrsState: number;
  xp: number;
  streak: number;
}

/** How long after recognition is learned the recall card first comes due. */
const RECALL_DELAY_MS = 24 * 60 * 60 * 1000;

const FSRS_COLUMNS =
  "due, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses, fsrs_state, last_review";

/**
 * Record one SRS answer: reschedule the FSRS card, append to reviews, log a
 * mistake when wrong, unlock the recall card when recognition is learned,
 * and update XP and the streak.
 */
export async function recordAnswer(input: AnswerInput): Promise<AnswerResult> {
  const { supabase, user, profile } = await requireUser();
  if (input.cardType !== "recognition" && input.cardType !== "recall") throw new Error("Unknown card type.");
  const now = new Date();
  const msTaken = Math.max(0, Math.min(Math.round(input.msTaken), 600_000));

  const [{ data: existing, error: loadError }, { data: item, error: itemError }] = await Promise.all([
    supabase
      .from("user_items")
      .select(FSRS_COLUMNS)
      .eq("user_id", user.id)
      .eq("item_id", input.itemId)
      .eq("card_type", input.cardType)
      .maybeSingle<UserItemCard>(),
    supabase.from("items").select("type").eq("id", input.itemId).single<{ type: string }>(),
  ]);
  if (loadError) throw new Error(loadError.message);
  if (itemError) throw new Error(itemError.message);

  const grade = gradeFromResult(input.correct, msTaken);
  const correct = input.correct;
  const next = review(existing ?? newCard(now), grade, now);

  const { error: saveError } = await supabase
    .from("user_items")
    .upsert({ user_id: user.id, item_id: input.itemId, card_type: input.cardType, ...next });
  if (saveError) throw new Error(saveError.message);

  const writes = [
    supabase.from("reviews").insert({
      item_id: input.itemId,
      card_type: input.cardType,
      grade,
      ms_taken: msTaken,
      source: "srs",
      fsrs_state: next.fsrs_state,
    }),
  ];
  if (!correct) {
    writes.push(
      supabase.from("mistakes").insert({
        item_id: input.itemId,
        source: "srs",
        detail: { card_type: input.cardType, given: input.given?.slice(0, 200) ?? null },
      }),
    );
  }
  if (input.cardType === "recognition" && next.fsrs_state === 2 && RECALL_TYPES.includes(item.type)) {
    writes.push(
      supabase
        .from("user_items")
        .upsert(
          // Start the reverse card tomorrow, not straight after: same-day repeats of a word just learned add little.
          { user_id: user.id, item_id: input.itemId, card_type: "recall", ...newCard(new Date(now.getTime() + RECALL_DELAY_MS)) },
          { ignoreDuplicates: true },
        ),
    );
  }
  for (const { error } of await Promise.all(writes)) if (error) throw new Error(error.message);

  const { xp, streak } = await awardXp(supabase, user.id, profile.timezone, correct ? XP_CORRECT : XP_WRONG, now);

  revalidatePath("/");
  return { due: next.due, fsrsState: next.fsrs_state, xp, streak };
}
