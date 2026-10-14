import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { KANJI_BY_LEVEL } from "@/lib/kanji-levels.generated";
import { KANJI_LEVELS } from "@/lib/kanji-levels";

/** Share of a level's kanji to start before its kanji show everywhere (the next level's exam prints them). */
const STAGE_DONE = 0.8;

export interface KanjiStage {
  /** The level the learner is working through: its kanji and lower levels' show as kanji. */
  stage: string;
  /** Kanji the learner has started, shown as kanji whatever their level. */
  known: string;
}

/** The learner's kanji stage: the first level whose kanji they haven't mostly started yet. */
export async function loadKanjiStage(supabase: SupabaseClient, userId: string): Promise<KanjiStage> {
  const rows = await fetchAll<{ items: { term: string } }>((from, to) =>
    supabase
      .from("user_items")
      .select("item_id, items!inner(term, type)")
      .eq("user_id", userId)
      .eq("card_type", "recognition")
      .eq("items.type", "kanji")
      .order("item_id")
      .range(from, to)
      .returns<{ items: { term: string } }[]>(),
  );
  const known = [...new Set(rows.map((r) => r.items.term).filter((t) => [...t].length === 1))].join("");
  const stage =
    KANJI_LEVELS.find((l) => {
      const all = KANJI_BY_LEVEL[l];
      const started = [...all].filter((k) => known.includes(k)).length;
      return started < [...all].length * STAGE_DONE;
    }) ?? "N2";
  return { stage, known };
}
