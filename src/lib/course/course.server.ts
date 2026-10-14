import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/auth";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { dueQueue } from "@/lib/srs/fsrs";
import type { StudyItem } from "@/lib/study/cards";
import { ITEM_COLUMNS } from "@/lib/study/session.server";
import { adapt, COURSE_TYPES, courseLevels, levelProgress, planUnits, type Adaptation, type LearnerState, type LevelProgress, type Unit } from "./engine";
import type { Sentence } from "./unit";

type ItemRow = StudyItem & { data: { freq?: number | null } | null };

export interface CourseData {
  items: ItemRow[];
  state: LearnerState;
  levels: LevelProgress[];
  adaptation: Adaptation;
  units: Unit[];
}

/** How far back mistakes count towards "struggling". */
const MISTAKE_WINDOW_DAYS = 14;

/** Everything the course engine needs about the learner, and the plan it makes. */
export async function loadCourse(supabase: SupabaseClient, profile: Profile, now = new Date()): Promise<CourseData> {
  const since = new Date(now.getTime() - MISTAKE_WINDOW_DAYS * 86_400_000).toISOString();
  const [items, cards, { data: reviews, error: reviewsError }, { data: mistakes, error: mistakesError }] = await Promise.all([
    fetchAll<ItemRow>((from, to) =>
      supabase
        .from("items")
        .select(ITEM_COLUMNS)
        .eq("status", "live")
        .in("type", COURSE_TYPES)
        .order("id")
        .range(from, to)
        .returns<ItemRow[]>(),
    ),
    fetchAll<{ item_id: string; card_type: string; due: string; fsrs_state: number; lapses: number }>((from, to) =>
      supabase
        .from("user_items")
        .select("item_id, card_type, due, fsrs_state, lapses")
        .eq("user_id", profile.id)
        .order("item_id")
        .order("card_type")
        .range(from, to),
    ),
    supabase.from("reviews").select("grade").eq("user_id", profile.id).order("reviewed_at", { ascending: false }).limit(60),
    supabase.from("mistakes").select("item_id").eq("user_id", profile.id).is("resolved_at", null).gte("created_at", since),
  ]);
  if (reviewsError) throw new Error(reviewsError.message);
  if (mistakesError) throw new Error(mistakesError.message);

  const byId = new Map(items.map((i) => [i.id, i]));
  const recognition = cards.filter((c) => c.card_type === "recognition" && byId.has(c.item_id));
  const missed = new Map<string, number>();
  for (const m of mistakes as { item_id: string | null }[]) if (m.item_id) missed.set(m.item_id, (missed.get(m.item_id) ?? 0) + 1);

  const state: LearnerState = {
    started: new Set(recognition.map((c) => c.item_id)),
    learnedSlugs: new Set(recognition.filter((c) => c.fsrs_state === 2).map((c) => byId.get(c.item_id)!.slug)),
    recentGrades: (reviews as { grade: number }[]).map((r) => r.grade),
    dueCount: dueQueue(cards.filter((c) => byId.has(c.item_id)), now).length,
    struggling: recognition
      .map((c) => ({ itemId: c.item_id, weight: c.lapses * 2 + (missed.get(c.item_id) ?? 0) }))
      .filter((s) => s.weight >= 2)
      .sort((a, b) => b.weight - a.weight),
  };
  const levels = courseLevels(profile.target_level);
  return {
    items,
    state,
    levels: levelProgress(items, levels, state),
    adaptation: adapt(state),
    units: planUnits(items, profile.target_level, state),
  };
}

/** Example sentences and lesson dialogue lines to show words in context. */
export async function loadSentences(supabase: SupabaseClient, items: StudyItem[]): Promise<Sentence[]> {
  const [{ data: extra, error }, { data: lessons, error: lessonsError }] = await Promise.all([
    supabase.from("items").select("examples").eq("status", "live").in("type", ["grammar", "sentence"]),
    supabase.from("lessons").select("dialogue").eq("status", "live"),
  ]);
  if (error) throw new Error(error.message);
  if (lessonsError) throw new Error(lessonsError.message);
  const examples = [...items, ...((extra ?? []) as Pick<StudyItem, "examples">[])].flatMap((i) => i.examples ?? []);
  const lines = ((lessons ?? []) as { dialogue: { jp: string; en: string; reading?: string }[] }[]).flatMap((l) => l.dialogue);
  // Whole sentences only: word glosses like "あめ (ame)" aren't context.
  return [...examples, ...lines].filter((s) => s.jp && s.en && /[。？！?]$/.test(s.jp.trim()) && !/\([A-Za-z]/.test(s.jp));
}

/** Link to a unit: its new items and refreshers by slug. */
export function unitHref(unit: Pick<Unit, "items" | "refresh">): string {
  const q = new URLSearchParams({ i: unit.items.map((i) => i.slug).join(",") });
  if (unit.refresh.length) q.set("r", unit.refresh.map((i) => i.slug).join(","));
  return `/course/unit?${q}`;
}
