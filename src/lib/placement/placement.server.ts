import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/auth";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { ITEM_COLUMNS } from "@/lib/study/session.server";
import type { StudyItem } from "@/lib/study/cards";
import { courseLevels } from "@/lib/course/engine";
import { knownCard, placementQuizzes, spreadDays, type LevelQuiz } from "./placement";

type WordRow = StudyItem & { data: { freq?: number | null } | null };

async function loadWords(supabase: SupabaseClient, profile: Profile) {
  const levels = courseLevels(profile.target_level);
  const [words, started] = await Promise.all([
    fetchAll<WordRow>((from, to) =>
      supabase
        .from("items")
        .select(ITEM_COLUMNS)
        .eq("status", "live")
        .eq("type", "word")
        .in("jlpt_level", levels)
        .order("id")
        .range(from, to)
        .returns<WordRow[]>(),
    ),
    fetchAll<{ item_id: string }>((from, to) =>
      supabase
        .from("user_items")
        .select("item_id")
        .eq("user_id", profile.id)
        .eq("card_type", "recognition")
        .order("item_id")
        .range(from, to),
    ),
  ]);
  return { words, started: new Set(started.map((s) => s.item_id)) };
}

export async function loadPlacement(supabase: SupabaseClient, profile: Profile): Promise<LevelQuiz[]> {
  const { words, started } = await loadWords(supabase, profile);
  return placementQuizzes(words, started, profile.target_level);
}

/**
 * Mark words as known: the ones answered right (first check in 1–4 weeks)
 * and every unstarted word of the levels passed (spread over 3 months,
 * commonest first). Cards that already exist are left alone.
 */
export async function markKnown(
  supabase: SupabaseClient,
  profile: Profile,
  { correctIds, levels }: { correctIds: string[]; levels: string[] },
  now = new Date(),
): Promise<number> {
  const { words, started } = await loadWords(supabase, profile);
  const fresh = words.filter((w) => !started.has(w.id));
  const correct = new Set(correctIds);
  const tested = fresh.filter((w) => correct.has(w.id));
  const bulk = fresh
    .filter((w) => !correct.has(w.id) && levels.includes(w.jlpt_level))
    .sort((a, b) => (a.data?.freq ?? Number.MAX_SAFE_INTEGER) - (b.data?.freq ?? Number.MAX_SAFE_INTEGER));

  const testedDays = spreadDays(tested.length, 7, 28);
  const bulkDays = spreadDays(bulk.length, 3, 90);
  const rows = [
    ...tested.map((w, i) => ({ user_id: profile.id, item_id: w.id, card_type: "recognition", ...knownCard(now, testedDays[i]) })),
    ...bulk.map((w, i) => ({ user_id: profile.id, item_id: w.id, card_type: "recognition", ...knownCard(now, bulkDays[i]) })),
  ];
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from("user_items").upsert(rows.slice(i, i + 500), { ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }
  return rows.length;
}
