import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { isSituation } from "@/lib/lessons/lessons";
import { READINESS_LEVELS, readiness, type MockInput, type Readiness, type ReadinessLevel } from "./readiness";

type Item = { id: string; type: string; jlpt_level: string };
type Scored = { best_score: number; max_score: number };

/** Readiness for every level from N5 to N2, from what the learner has done. */
export async function loadReadiness(supabase: SupabaseClient, userId: string): Promise<Readiness[]> {
  const [items, known, lessons, lessonDone, texts, textDone, mocks] = await Promise.all([
    fetchAll<Item>((from, to) =>
      supabase.from("items").select("id, type, jlpt_level").eq("status", "live").in("type", ["word", "kanji"]).order("id").range(from, to).returns<Item[]>(),
    ),
    fetchAll<{ item_id: string }>((from, to) =>
      supabase
        .from("user_items")
        .select("item_id")
        .eq("user_id", userId)
        .eq("card_type", "recognition")
        .eq("fsrs_state", 2)
        .order("item_id")
        .range(from, to)
        .returns<{ item_id: string }[]>(),
    ),
    supabase.from("lessons").select("id, slug, jlpt_level").eq("status", "live").returns<{ id: string; slug: string; jlpt_level: string }[]>(),
    supabase.from("lesson_progress").select("lesson_id").eq("user_id", userId).returns<{ lesson_id: string }[]>(),
    supabase.from("texts").select("id, kind, jlpt_level").eq("status", "live").in("kind", ["reading", "listening"]).returns<{ id: string; kind: string; jlpt_level: string }[]>(),
    supabase.from("text_progress").select("text_id, best_score, max_score").eq("user_id", userId).returns<(Scored & { text_id: string })[]>(),
    supabase
      .from("mock_attempts")
      .select("result, finished_at, mock_tests(jlpt_level)")
      .eq("user_id", userId)
      .order("finished_at", { ascending: false })
      .limit(50)
      .returns<{ result: { mode?: string; prediction?: { total: number; maxTotal: number; passTotal: number; passed: boolean } | null }; finished_at: string; mock_tests: { jlpt_level: string } | null }[]>(),
  ]);
  const knownIds = new Set(known.map((k) => k.item_id));
  const doneLessons = new Set((lessonDone.data ?? []).map((l) => l.lesson_id));
  const textScores = new Map((textDone.data ?? []).map((t) => [t.text_id, t]));

  return READINESS_LEVELS.map((level: ReadinessLevel) => {
    const count = (type: string) => {
      const at = items.filter((i) => i.type === type && i.jlpt_level === level);
      return { done: at.filter((i) => knownIds.has(i.id)).length, total: at.length };
    };
    const levelLessons = (lessons.data ?? []).filter((l) => l.jlpt_level === level && !isSituation(l.slug));
    const practice = (kind: string) => {
      const at = (texts.data ?? []).filter((t) => t.kind === kind && t.jlpt_level === level);
      const done = at.flatMap((t) => textScores.get(t.id) ?? []);
      const score = done.length ? done.reduce((n, d) => n + (d.max_score ? d.best_score / d.max_score : 0), 0) / done.length : null;
      return { done: done.length, total: at.length, score };
    };
    const last = (mocks.data ?? []).find((m) => m.mock_tests?.jlpt_level === level && m.result?.mode !== "practice" && m.result?.prediction);
    const mock: MockInput | null = last?.result.prediction
      ? { ...last.result.prediction, finishedAt: last.finished_at }
      : null;
    return readiness(level, {
      vocab: count("word"),
      kanji: count("kanji"),
      lessons: { done: levelLessons.filter((l) => doneLessons.has(l.id)).length, total: levelLessons.length },
      reading: practice("reading"),
      listening: practice("listening"),
      mock,
    });
  });
}
