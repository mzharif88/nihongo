import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/auth";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { dueQueue } from "@/lib/srs/fsrs";
import { buildCard, type CardType, type StudyCard, type StudyItem } from "./cards";
import { pickNewItems, SRS_TYPES } from "./curriculum";
import { studyPace, type Pace } from "./pace";
import { listTopics, pickTopicItems, type Topic } from "./topics";
import { localDate } from "./streak";

export const ITEM_COLUMNS =
  "id, slug, type, jlpt_level, term, reading, romaji, meaning, mnemonic, examples, tags, topic, prerequisites, audio_url, status, data";

type ItemRow = StudyItem & { status: string; data: { freq?: number | null } | null };

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
  /** Items started so far (recognition cards). */
  started: number;
  /** Live items not started yet, i.e. how much content is left to learn. */
  unstartedAvailable: number;
  pace: Pace;
  topics: Topic[];
  /** The topic new items came from, or null for automatic order (including when the chosen topic is finished). */
  activeTopic: Topic | null;
}

/**
 * Build today's session: every due review (most overdue first), then new
 * items up to the exam-date pace for today, plus `extraNew` more when the
 * learner asks to keep going.
 */
export async function loadStudySession(
  supabase: SupabaseClient,
  profile: Profile,
  { now = new Date(), extraNew = 0 }: { now?: Date; extraNew?: number } = {},
): Promise<StudySession> {
  const [items, cards] = await Promise.all([
    fetchAll<ItemRow>((from, to) =>
      supabase
        .from("items")
        .select(ITEM_COLUMNS)
        // Admins can read drafts too, so filter to live explicitly.
        .eq("status", "live")
        .in("type", SRS_TYPES)
        .order("id")
        .range(from, to)
        .returns<ItemRow[]>(),
    ),
    fetchAll<UserItemRow>((from, to) =>
      supabase
        .from("user_items")
        .select("item_id, card_type, due, fsrs_state, created_at")
        .eq("user_id", profile.id)
        .order("item_id")
        .order("card_type")
        .range(from, to)
        .returns<UserItemRow[]>(),
    ),
  ]);
  const byId = new Map(items.map((i) => [i.id, i]));
  const today = localDate(now, profile.timezone);

  // Due reviews for items that are still live.
  const due = dueQueue(
    cards.filter((c) => byId.has(c.item_id)),
    now,
  );

  // New items: not started, prerequisites learned, within today's allowance.
  const recognition = cards.filter((c) => c.card_type === "recognition");
  const started = new Set(recognition.map((c) => c.item_id));
  const learnedSlugs = new Set(
    recognition.filter((c) => c.fsrs_state === 2).flatMap((c) => byId.get(c.item_id)?.slug ?? []),
  );
  const introducedToday = recognition.filter((c) => localDate(new Date(c.created_at), profile.timezone) === today).length;
  const pace = studyPace({
    targetLevel: profile.target_level,
    examDate: profile.exam_date,
    today,
    started: recognition.length,
  });
  const newLeftToday = Math.max(0, pace.newPerDay - introducedToday);
  const allowance = newLeftToday + Math.max(0, extraNew);

  // Topic of the day: new items come from the chosen topic until it runs out, then automatic order.
  const topics = listTopics(items, started);
  const chosen = topics.find((t) => t.id === profile.study_topic) ?? null;
  const fromTopic = chosen ? pickTopicItems(items, chosen.id, started, learnedSlugs, allowance) : [];
  const activeTopic = fromTopic.length > 0 ? chosen : null;
  const fresh = activeTopic ? fromTopic : pickNewItems(items, started, learnedSlugs, allowance);

  return {
    cards: [
      ...due.map((c) => buildCard(byId.get(c.item_id)!, c.card_type, false, items)),
      ...fresh.map((i) => buildCard(i, "recognition", true, items)),
    ],
    dueCount: due.length,
    newCount: fresh.length,
    newLeftToday,
    started: recognition.length,
    unstartedAvailable: items.filter((i) => !started.has(i.id)).length,
    pace,
    topics,
    activeTopic,
  };
}
