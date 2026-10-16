import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { nightRecallOpen, recallQueue, type RecallPhrase } from "@/lib/newcomer/recall";
import { loadMyPhrases, loadStarterProgress, mineAsRecall, starterRecall } from "@/lib/newcomer/newcomer.server";
import { starterTopic } from "@/lib/newcomer/starter";
import { RecallClient, type RecallCard } from "./recall-client";

export const dynamic = "force-dynamic";

const card = (p: RecallPhrase & { meaningMs?: string }): RecallCard => ({
  key: p.key,
  meaning: p.meaning,
  meaningMs: p.meaningMs ?? null,
  jp: p.jp,
  reading: p.reading,
  kana: p.kana,
  right: p.right,
  wrong: p.wrong,
});

export default async function RecallPage({ searchParams }: { searchParams: Promise<{ topic?: string; all?: string }> }) {
  const { topic: slug, all } = await searchParams;
  const { supabase, profile } = await requireUser();
  const now = new Date();
  let title = "My phrases";
  let phrases: (RecallPhrase & { meaningMs?: string })[];
  if (slug) {
    const topic = starterTopic(slug);
    if (!topic) notFound();
    title = topic.title;
    phrases = starterRecall(topic, await loadStarterProgress(supabase), now);
  } else {
    phrases = (await loadMyPhrases(supabase)).map(mineAsRecall);
  }
  let queue = recallQueue(phrases, now);
  // Nothing due, or the learner asked: practise the weakest ones anyway.
  const extra = all === "1" || queue.length === 0;
  if (extra) {
    const score = (p: RecallPhrase) => (p.right + p.wrong ? p.right / (p.right + p.wrong) : 0);
    queue = phrases.filter((p) => p.priority !== "paused").sort((a, b) => score(a) - score(b)).slice(0, 20);
  }

  return (
    <RecallClient
      title={title}
      topic={slug ?? null}
      cards={queue.map(card)}
      extra={extra}
      night={!slug && nightRecallOpen(now, profile.timezone)}
    />
  );
}
