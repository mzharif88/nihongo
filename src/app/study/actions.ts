"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import type { CardType } from "@/lib/study/cards";
import { applyAnswer } from "@/lib/study/answer.server";
import { awardXp } from "@/lib/study/award.server";
import { XP_CORRECT, XP_WRONG } from "@/lib/study/streak";

export interface AnswerInput {
  itemId: string;
  cardType: CardType;
  correct: boolean;
  msTaken: number;
  given?: string;
  /** Where the answer came from: plain study or a course unit. */
  source?: "srs" | "course";
}

export interface AnswerResult {
  due: string;
  fsrsState: number;
  xp: number;
  streak: number;
}

/** Record one SRS answer (see applyAnswer), then update XP and the streak. */
export async function recordAnswer(input: AnswerInput): Promise<AnswerResult> {
  const { supabase, user, profile } = await requireUser();
  if (input.cardType !== "recognition" && input.cardType !== "recall") throw new Error("Unknown card type.");
  const now = new Date();

  const { data: item, error: itemError } = await supabase.from("items").select("type").eq("id", input.itemId).single<{ type: string }>();
  if (itemError) throw new Error(itemError.message);

  const next = await applyAnswer(
    supabase,
    user.id,
    { ...input, itemType: item.type, correct: input.correct, source: input.source === "course" ? "course" : "srs" },
    now,
  );
  const { xp, streak } = await awardXp(supabase, user.id, profile.timezone, input.correct ? XP_CORRECT : XP_WRONG, now);

  revalidatePath("/");
  return { due: next.due, fsrsState: next.fsrs_state, xp, streak };
}
