import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile } from "@/lib/auth";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { dueQueue } from "@/lib/srs/fsrs";
import { buildCard, type CardType, type StudyCard, type StudyItem } from "./cards";
import { phraseWordIds, pickNewItems, SRS_TYPES } from "./curriculum";
import { studyPace, type Pace } from "./pace";
import { inTopic, listTopics, pickTopicItems, type Topic } from "./topics";
import { learnerStage, RECENT, withOptionCount, type Stage } from "./mastery";
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

/** New items per session; finishing a session and pressing "Keep going" brings the next batch. No daily limit. */
export const NEW_BATCH = 10;

export interface StudySession {
  cards: StudyCard[];
  /** Due reviews in this session (all of them, or the topic's). */
  dueCount: number;
  newCount: number;
  /** Due reviews across everything, for the home page. */
  totalDue: number;
  /** New items introduced today (shown against the pace, never a limit). */
  introducedToday: number;
  /** Items started so far (recognition cards). */
  started: number;
  /** Unstarted items left in this session's scope (the topic, or everything). */
  unstartedInScope: number;
  pace: Pace;
  topics: Topic[];
  /** The topic this session studies, or null for everything. */
  topic: Topic | null;
  /** How much support the learner gets (answer choices, new items per group). */
  stage: Stage;
}

/**
 * Build a study session: every due review (most overdue first), then the
 * next batch of new items. With a topic, both are limited to that topic,
 * so leaving halfway and reopening it carries on from the next unanswered
 * card (every answer is saved as it happens).
 */
export async function loadStudySession(
  supabase: SupabaseClient,
  profile: Profile,
  { now = new Date(), topicId = null }: { now?: Date; topicId?: string | null } = {},
): Promise<StudySession> {
  const [items, cards, { data: reviews, error: reviewsError }, { data: phraseRows }] = await Promise.all([
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
    supabase.from("reviews").select("grade").eq("user_id", profile.id).order("reviewed_at", { ascending: false }).limit(RECENT),
    // Words the learner says in their own Newcomer phrases come first.
    supabase.from("newcomer_phrases").select("words").neq("priority", "paused"),
  ]);
  if (reviewsError) throw new Error(reviewsError.message);
  const byId = new Map(items.map((i) => [i.id, i]));
  const today = localDate(now, profile.timezone);

  // Due reviews for items that are still live.
  const allDue = dueQueue(
    cards.filter((c) => byId.has(c.item_id)),
    now,
  );

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

  const topics = listTopics(items, started, new Set(allDue.map((c) => c.item_id)));
  const topic = topics.find((t) => t.id === topicId) ?? null;

  const due = topic ? allDue.filter((c) => inTopic(byId.get(c.item_id)!, topic.id)) : allDue;
  const fresh = topic
    ? pickTopicItems(items, topic.id, started, learnedSlugs, NEW_BATCH)
    : pickNewItems(items, started, learnedSlugs, NEW_BATCH, phraseWordIds(items, ((phraseRows ?? []) as { words: string[] }[]).flatMap((r) => r.words)));

  const stage = learnerStage(learnedSlugs.size, (reviews as { grade: number }[]).map((r) => r.grade));
  return {
    cards: [
      ...due.map((c) => buildCard(byId.get(c.item_id)!, c.card_type, false, items)),
      ...fresh.map((i) => buildCard(i, "recognition", true, items)),
    ].map((c) => withOptionCount(c, stage.options)),
    stage,
    dueCount: due.length,
    newCount: fresh.length,
    totalDue: allDue.length,
    introducedToday,
    started: recognition.length,
    unstartedInScope: topic ? topic.remaining : items.filter((i) => !started.has(i.id)).length,
    pace,
    topics,
    topic,
  };
}
