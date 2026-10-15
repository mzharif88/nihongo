import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { buildCard, type StudyItem } from "@/lib/study/cards";
import { ITEM_COLUMNS } from "@/lib/study/session.server";
import { inTopic, TOPIC_ID } from "@/lib/study/topics";
import { Drill } from "./drill";

export const dynamic = "force-dynamic";

/** Cards per round for big topics (a whole level of words). */
const ROUND = 20;

/**
 * Retake a topic as a quick drill: multiple choice, straight on to the next
 * card. Practice only: answers don't touch the review schedule. Uses the
 * items already started (all of them if none are), in random rounds.
 */
export default async function DrillPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { topic } = await searchParams;
  if (!topic || !TOPIC_ID.test(topic)) {
    return (
      <main className="mx-auto max-w-md px-4 py-8">
        <p>Pick a topic to retake from the home page.</p>
        <Link href="/" className="text-accent underline">
          Home
        </Link>
      </main>
    );
  }
  const { supabase, profile } = await requireUser();
  const type = topic.startsWith("kana:") ? "kana" : topic.startsWith("kanji:") ? "kanji" : "word";
  const [items, started] = await Promise.all([
    fetchAll<StudyItem>((from, to) =>
      supabase.from("items").select(ITEM_COLUMNS).eq("status", "live").eq("type", type).order("id").range(from, to).returns<StudyItem[]>(),
    ),
    fetchAll<{ item_id: string }>((from, to) =>
      supabase.from("user_items").select("item_id").eq("user_id", profile.id).eq("card_type", "recognition").order("item_id").range(from, to),
    ),
  ]);
  const inScope = items.filter((i) => inTopic(i, topic));
  const done = new Set(started.map((s) => s.item_id));
  const learned = inScope.filter((i) => done.has(i.id));
  const pool = learned.length ? learned : inScope;
  // Kana: three options, as quick as possible. Everything else keeps four.
  const options = type === "kana" ? 3 : 4;
  const cards = pool.map((i) => {
    const card = buildCard(i, "recognition", false, inScope);
    const wrong = card.options!.filter((_, k) => k !== card.answerIndex).slice(0, options - 1);
    const answer = card.options![card.answerIndex!];
    return { ...card, options: [answer, ...wrong] };
  });
  const label = topic.replace(/^kana:/, "").replace(/^(kanji|words):/, "$1 ").replace(/^topic:/, "");

  return <Drill title={`Retake: ${label}`} cards={cards} round={ROUND} />;
}
