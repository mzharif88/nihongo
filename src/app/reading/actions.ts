"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { queueForReview } from "@/lib/mock/mock.server";
import { loadReading } from "@/lib/reading/reading.server";
import { awardXp } from "@/lib/study/award.server";
import { XP_CORRECT, XP_WRONG } from "@/lib/study/streak";

export interface ReadingResult {
  score: number;
  max: number;
  correct: boolean[];
  xpGained: number;
  streak: number;
}

/** Finish a reading passage: score its questions on the server, keep the best score, log misses, award XP. */
export async function completeReading(slug: string, answers: (number | null)[]): Promise<ReadingResult> {
  const { supabase, user, profile } = await requireUser();
  const loaded = await loadReading(supabase, user.id, slug);
  if (!loaded) throw new Error("Passage not found.");
  const { text, questions, progress } = loaded;
  const now = new Date();

  const correct = questions.map((q, i) => Array.isArray(answers) && answers[i] === q.answer);
  const score = correct.filter(Boolean).length;
  const { error } = await supabase.from("text_progress").upsert({
    user_id: user.id,
    text_id: text.id,
    best_score: Math.max(score, progress?.best_score ?? 0),
    max_score: questions.length,
    attempts: (progress?.attempts ?? 0) + 1,
    completed_at: now.toISOString(),
  });
  if (error) throw new Error(error.message);

  const wrong = questions.filter((_, i) => !correct[i]);
  if (wrong.length) {
    const { error: mError } = await supabase.from("mistakes").insert(
      wrong.map((q) => ({
        source: "reader",
        detail: { text: text.slug, question: q.slug, given: answers?.[questions.indexOf(q)] ?? null, answer: q.answer },
      })),
    );
    if (mError) throw new Error(mError.message);
    await queueForReview(supabase, user.id, wrong.flatMap((q) => q.item_slugs), now);
  }

  const xpGained = score * XP_CORRECT + (questions.length - score) * XP_WRONG;
  const { streak } = await awardXp(supabase, user.id, profile.timezone, xpGained, now);
  revalidatePath("/");
  revalidatePath("/reading");
  return { score, max: questions.length, correct, xpGained, streak };
}
