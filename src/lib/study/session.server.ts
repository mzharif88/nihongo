import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/auth";
import { DEFAULT_MS_PER_REVIEW, dueQueue } from "@/lib/srs/fsrs";
import { buildCard, type CardType, type StudyCard, type StudyItem } from "./cards";
import { newItemsPerDay, pickNewItems, SRS_TYPES } from "./curriculum";
import { localDate } from "./streak";

export const ITEM_COLUMNS =
  "id, slug, type, jlpt_level, term, reading, romaji, meaning, mnemonic, examples, tags, topic, prerequisites, audio_url, status";

type ItemRow = StudyItem & { status: string };

interface UserItemRow {
  item_id: string;
  card_type: CardType;
  due: string;
  fsrs_state: number;
  created_at: string;
}

export interface StudySession {
  cards: StudyCard[];
  dueCount: number;
  newCount: number;
  newLeftToday: number;
}

/** Average answer time over recent reviews, so the 15-minute cap reflects this learner's pace. */
async function averageMs(supabase: SupabaseClient): Promise<number> {
  const { data } = await supabase
    .from("reviews")
    .select("ms_taken")
    .not("ms_taken", "is", null)
    .order("reviewed_at", { ascending: false })
    .limit(100);
  const times = (data ?? []).map((r) => r.ms_taken as number).filter((ms) => ms > 0 && ms < 120_000);
  return times.length >= 10 ? times.reduce((a, b) => a + b, 0) / times.length : DEFAULT_MS_PER_REVIEW;
}

/**
 * Build today's session: due reviews (most overdue first, capped to the
 * 15-minute budget), then new items up to today's allowance.
 */
export async function loadStudySession(
  supabase: SupabaseClient,
  profile: Profile,
  now = new Date(),
): Promise<StudySession> {
  const [{ data: itemRows, error: itemsError }, { data: cardRows, error: cardsError }, msPerReview] =
    await Promise.all([
      // Admins can read drafts too, so filter to live explicitly.
      supabase.from("items").select(ITEM_COLUMNS).eq("status", "live").in("type", SRS_TYPES).returns<ItemRow[]>(),
      supabase
        .from("user_items")
        .select("item_id, card_type, due, fsrs_state, created_at")
        .eq("user_id", profile.id)
        .returns<UserItemRow[]>(),
      averageMs(supabase),
    ]);
  if (itemsError) throw new Error(itemsError.message);
  if (cardsError) throw new Error(cardsError.message);

  const items = itemRows ?? [];
  const cards = cardRows ?? [];
  const byId = new Map(items.map((i) => [i.id, i]));
  const today = localDate(now, profile.timezone);

  // Due reviews for items that are still live.
  const due = dueQueue(
    cards.filter((c) => byId.has(c.item_id)),
    now,
    msPerReview,
  );

  // New items: not started, prerequisites learned, within today's allowance.
  const recognition = cards.filter((c) => c.card_type === "recognition");
  const started = new Set(recognition.map((c) => c.item_id));
  const learnedSlugs = new Set(
    recognition.filter((c) => c.fsrs_state === 2).flatMap((c) => byId.get(c.item_id)?.slug ?? []),
  );
  const introducedToday = recognition.filter((c) => localDate(new Date(c.created_at), profile.timezone) === today).length;
  const newLeftToday = Math.max(0, newItemsPerDay(profile.daily_minutes) - introducedToday);
  const fresh = pickNewItems(items, started, learnedSlugs, newLeftToday);

  return {
    cards: [
      ...due.map((c) => buildCard(byId.get(c.item_id)!, c.card_type, false, items)),
      ...fresh.map((i) => buildCard(i, "recognition", true, items)),
    ],
    dueCount: due.length,
    newCount: fresh.length,
    newLeftToday,
  };
}
