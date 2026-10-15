import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { loadKanjiStage } from "@/lib/study/kanji-stage.server";
import { loadStudySession } from "@/lib/study/session.server";
import { TOPIC_ID } from "@/lib/study/topics";
import { StudySession } from "./session";

export const dynamic = "force-dynamic";

export default async function StudyPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) {
  const { topic: topicParam } = await searchParams;
  const topicId = topicParam && TOPIC_ID.test(topicParam) ? topicParam : null;
  const { supabase, user, profile } = await requireUser();
  const [session, kanji] = await Promise.all([loadStudySession(supabase, profile, { topicId }), loadKanjiStage(supabase, user.id)]);

  // Remember the last topic studied so the home page can offer "Continue".
  if (session.topic && profile.study_topic !== session.topic.id) {
    await supabase.from("profiles").update({ study_topic: session.topic.id }).eq("id", user.id);
  }

  const title = session.topic?.label ?? "Everything";
  const again = session.topic ? `/study?topic=${encodeURIComponent(session.topic.id)}` : "/study";
  const hasMore = session.unstartedInScope > session.newCount;

  if (session.cards.length === 0) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 text-center">
        <div className="text-5xl">🎉</div>
        <h1 className="mt-4 text-2xl font-bold">{title}: all done for now</h1>
        <p className="mt-2 text-muted">
          {session.unstartedInScope === 0
            ? "You've started every item here. Reviews will come back as they fall due."
            : "Nothing is unlocked yet. Learn the earlier items first, then come back."}
        </p>
        {session.topic && session.unstartedInScope === 0 && (
          <Link
            href={`/drill?topic=${encodeURIComponent(session.topic.id)}`}
            className="mt-8 rounded-lg bg-accent px-4 py-2.5 font-medium text-white"
          >
            Retake as a quick drill
          </Link>
        )}
        <Link href="/" className="mt-3 rounded-lg border border-border px-4 py-2.5 font-medium">
          Pick another topic
        </Link>
      </main>
    );
  }

  return (
    <StudySession
      title={title}
      cards={session.cards}
      kanji={kanji}
      keepGoingHref={hasMore || session.totalDue > session.dueCount ? again : null}
    />
  );
}
