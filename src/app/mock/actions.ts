"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { scoreMock, type Answers } from "@/lib/mock/mock";
import { loadMock, queueForReview } from "@/lib/mock/mock.server";
import { awardXp } from "@/lib/study/award.server";
import { XP_CORRECT, XP_WRONG } from "@/lib/study/streak";

/**
 * Finish a mock: score it on the server, save the attempt, log every miss as
 * a mistake, put the words behind wrong answers into reviews, and award XP.
 * Returns the attempt id for the results page.
 */
export async function submitMock(
  slug: string,
  answers: Answers,
  meta: { startedAt?: string; mode: "exam" | "practice" },
): Promise<{ attemptId: number }> {
  const { supabase, user, profile } = await requireUser();
  const loaded = await loadMock(supabase, slug);
  if (!loaded) throw new Error("Mock test not found.");
  const { mock, questions } = loaded;
  const now = new Date();

  const clean: Answers = {};
  for (const q of questions) {
    const a = answers?.[q.id];
    clean[q.id] = typeof a === "number" && Number.isInteger(a) && a >= 0 && a < q.options.length ? a : null;
  }
  const result = scoreMock(mock.jlpt_level, questions, clean);
  const started = meta?.startedAt && !Number.isNaN(Date.parse(meta.startedAt)) ? meta.startedAt : null;

  const wrongQuestions = questions.filter((q) => result.wrong.includes(q.id));
  const added = await queueForReview(supabase, user.id, wrongQuestions.flatMap((q) => q.item_slugs), now);

  const { data: attempt, error } = await supabase
    .from("mock_attempts")
    .insert({
      mock_test_id: mock.id,
      answers: clean,
      result: { ...result, mode: meta?.mode === "practice" ? "practice" : "exam", added },
      correct: result.correct,
      total: result.total,
      // Only exam-conditions runs count towards the pass record.
      passed: meta?.mode !== "practice" && (result.prediction?.passed ?? false),
      started_at: started,
      finished_at: now.toISOString(),
    })
    .select("id")
    .single<{ id: number }>();
  if (error) throw new Error(error.message);

  if (wrongQuestions.length) {
    const { data: items } = await supabase
      .from("items")
      .select("id, slug")
      .in("slug", [...new Set(wrongQuestions.flatMap((q) => q.item_slugs))]);
    const idBySlug = new Map((items ?? []).map((i: { id: string; slug: string }) => [i.slug, i.id]));
    const { error: mError } = await supabase.from("mistakes").insert(
      wrongQuestions.map((q) => ({
        item_id: q.item_slugs.map((s) => idBySlug.get(s)).find(Boolean) ?? null,
        source: "mock",
        detail: { mock: mock.slug, question: q.slug, part: q.part, given: clean[q.id], answer: q.answer, attempt: attempt.id },
      })),
    );
    if (mError) throw new Error(mError.message);
  }

  await awardXp(supabase, user.id, profile.timezone, result.correct * XP_CORRECT + (result.total - result.correct) * XP_WRONG, now);
  revalidatePath("/");
  revalidatePath("/mock");
  return { attemptId: attempt.id };
}
