"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { builderXp, scoreBuilder } from "@/lib/builder/builder";
import { loadPattern } from "@/lib/builder/builder.server";
import { awardXp } from "@/lib/study/award.server";

export interface BuilderResult {
  score: number;
  max: number;
  correct: boolean[];
  xpGained: number;
  streak: number;
}

/**
 * Finish a builder run: check each arrangement on the server, keep the best
 * score, log wrong sentences as mistakes and award XP and the streak.
 * `answers[i]` is the tile texts the learner placed for exercise i, in order.
 */
export async function completeBuilder(slug: string, answers: string[][]): Promise<BuilderResult> {
  const { supabase, user, profile } = await requireUser();
  const detail = await loadPattern(supabase, user.id, slug);
  if (!detail) throw new Error("Pattern not found.");
  const { pattern, progress, grammar } = detail;
  const now = new Date();

  const safeAnswers = (Array.isArray(answers) ? answers : []).slice(0, pattern.examples.length).map((a) =>
    Array.isArray(a) ? a.slice(0, 30).map((t) => String(t).slice(0, 60)) : [],
  );
  const result = scoreBuilder(pattern.examples, safeAnswers);

  const { error } = await supabase.from("builder_progress").upsert({
    user_id: user.id,
    pattern_id: pattern.id,
    best_score: Math.max(result.score, progress?.best_score ?? 0),
    max_score: result.max,
    attempts: (progress?.attempts ?? 0) + 1,
    completed_at: now.toISOString(),
  });
  if (error) throw new Error(error.message);

  const wrong = pattern.examples.flatMap((ex, i) => (result.correct[i] ? [] : [{ ex, i }]));
  if (wrong.length) {
    const { error: mistakeError } = await supabase.from("mistakes").insert(
      wrong.map(({ ex, i }) => ({
        item_id: grammar?.id ?? null,
        source: "builder",
        detail: { pattern: pattern.slug, exercise: i, en: ex.en, answer: ex.jp, given: (safeAnswers[i] ?? []).join(" ") },
      })),
    );
    if (mistakeError) throw new Error(mistakeError.message);
  }

  const xpGained = builderXp(result.correct, !progress);
  const { streak } = await awardXp(supabase, user.id, profile.timezone, xpGained, now);
  revalidatePath("/");
  revalidatePath("/builder");
  return { ...result, xpGained, streak };
}
