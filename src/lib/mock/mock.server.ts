import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { newCard } from "@/lib/srs/fsrs";
import { SRS_TYPES } from "@/lib/study/curriculum";
import type { MockResult, MockRow, QuestionRow } from "./mock";

const QUESTION_COLUMNS = "id, slug, position, section, part, passage, prompt, options, answer, explanation, item_slugs";

export interface AttemptSummary {
  id: number;
  correct: number;
  total: number;
  passed: boolean;
  finished_at: string;
  result: MockResult & { mode?: string };
}

export interface MockSummary extends MockRow {
  questionCount: number;
  attempts: AttemptSummary[];
}

/** Live mock tests with their question counts and the learner's attempts (newest first). */
export async function loadMockList(supabase: SupabaseClient, userId: string): Promise<MockSummary[]> {
  const [{ data: mocks, error }, { data: questions, error: qError }, { data: attempts, error: aError }] = await Promise.all([
    supabase.from("mock_tests").select("id, slug, jlpt_level, title, time_limit_min").eq("status", "live"),
    supabase.from("questions").select("mock_test_slug").eq("status", "live").not("mock_test_slug", "is", null),
    supabase
      .from("mock_attempts")
      .select("id, mock_test_id, correct, total, passed, finished_at, result")
      .eq("user_id", userId)
      .order("finished_at", { ascending: false }),
  ]);
  if (error) throw new Error(error.message);
  if (qError) throw new Error(qError.message);
  if (aError) throw new Error(aError.message);
  const counts = new Map<string, number>();
  for (const q of questions as { mock_test_slug: string }[]) counts.set(q.mock_test_slug, (counts.get(q.mock_test_slug) ?? 0) + 1);
  const rank = ["preN5", "N5", "N4", "N3", "N2", "N1"];
  return (mocks as MockRow[])
    .map((m) => ({
      ...m,
      questionCount: counts.get(m.slug) ?? 0,
      attempts: (attempts as (AttemptSummary & { mock_test_id: string })[]).filter((a) => a.mock_test_id === m.id),
    }))
    .filter((m) => m.questionCount > 0)
    .sort((a, b) => rank.indexOf(a.jlpt_level) - rank.indexOf(b.jlpt_level) || a.title.localeCompare(b.title));
}

export async function loadMock(supabase: SupabaseClient, slug: string): Promise<{ mock: MockRow; questions: QuestionRow[] } | null> {
  const { data: mock, error } = await supabase
    .from("mock_tests")
    .select("id, slug, jlpt_level, title, time_limit_min")
    .eq("slug", slug)
    .eq("status", "live")
    .maybeSingle<MockRow>();
  if (error) throw new Error(error.message);
  if (!mock) return null;
  const { data: questions, error: qError } = await supabase
    .from("questions")
    .select(QUESTION_COLUMNS)
    .eq("mock_test_slug", slug)
    .eq("status", "live")
    .order("position");
  if (qError) throw new Error(qError.message);
  return { mock, questions: questions as QuestionRow[] };
}

export async function loadAttempt(supabase: SupabaseClient, userId: string, id: number) {
  const { data: attempt, error } = await supabase
    .from("mock_attempts")
    .select("id, mock_test_id, answers, result, correct, total, passed, started_at, finished_at")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!attempt) return null;
  const { data: mock, error: mError } = await supabase
    .from("mock_tests")
    .select("id, slug, jlpt_level, title, time_limit_min")
    .eq("id", attempt.mock_test_id)
    .maybeSingle<MockRow>();
  if (mError) throw new Error(mError.message);
  if (!mock) return null;
  const { data: questions, error: qError } = await supabase
    .from("questions")
    .select(QUESTION_COLUMNS)
    .eq("mock_test_slug", mock.slug)
    .order("position");
  if (qError) throw new Error(qError.message);
  return { attempt, mock, questions: questions as QuestionRow[] };
}

/**
 * Put items behind wrong answers in front of the learner: started items come
 * due now, unstarted ones get a new recognition card. Returns how many cards
 * were added or brought forward.
 */
export async function queueForReview(supabase: SupabaseClient, userId: string, itemSlugs: string[], now: Date): Promise<number> {
  if (itemSlugs.length === 0) return 0;
  const { data: items, error } = await supabase.from("items").select("id, type").in("slug", [...new Set(itemSlugs)]).eq("status", "live");
  if (error) throw new Error(error.message);
  const ids = (items as { id: string; type: string }[]).filter((i) => SRS_TYPES.includes(i.type)).map((i) => i.id);
  if (ids.length === 0) return 0;
  const { data: existing, error: eError } = await supabase
    .from("user_items")
    .select("item_id, due")
    .eq("user_id", userId)
    .eq("card_type", "recognition")
    .in("item_id", ids);
  if (eError) throw new Error(eError.message);
  const have = new Map((existing as { item_id: string; due: string }[]).map((r) => [r.item_id, r.due]));
  const fresh = ids.filter((id) => !have.has(id));
  const later = ids.filter((id) => have.has(id) && new Date(have.get(id)!) > now);
  if (fresh.length) {
    const { error: insError } = await supabase
      .from("user_items")
      .upsert(
        fresh.map((item_id) => ({ user_id: userId, item_id, card_type: "recognition", ...newCard(now) })),
        { onConflict: "user_id,item_id,card_type", ignoreDuplicates: true },
      );
    if (insError) throw new Error(insError.message);
  }
  if (later.length) {
    const { error: upError } = await supabase
      .from("user_items")
      .update({ due: now.toISOString() })
      .eq("user_id", userId)
      .eq("card_type", "recognition")
      .in("item_id", later);
    if (upError) throw new Error(upError.message);
  }
  return fresh.length + later.length;
}
