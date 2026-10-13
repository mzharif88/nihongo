import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { loadStudySession } from "@/lib/study/session.server";
import { StudySession } from "./session";

export const dynamic = "force-dynamic";

const MORE_STEP = 10;

export default async function StudyPage({ searchParams }: { searchParams: Promise<{ more?: string }> }) {
  const { more } = await searchParams;
  const extraNew = Math.min(100, Math.max(0, Number(more) || 0));
  const { supabase, profile } = await requireUser();
  const session = await loadStudySession(supabase, profile, { extraNew });
  const canLearnMore = session.unstartedAvailable > session.newCount;

  if (session.cards.length === 0) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 text-center">
        <div className="text-5xl">🎉</div>
        <h1 className="mt-4 text-2xl font-bold">All caught up</h1>
        <p className="mt-2 text-muted">
          {session.newLeftToday === 0
            ? "No reviews due, and today's new items for your pace are done."
            : "No reviews due and nothing new is unlocked yet. Keep reviewing to unlock the next items."}
        </p>
        {canLearnMore && (
          <Link href={`/study?more=${MORE_STEP}`} className="mt-8 rounded-lg bg-accent px-4 py-2.5 font-medium text-white">
            Learn {MORE_STEP} more
          </Link>
        )}
        <Link href="/" className="mt-3 rounded-lg border border-border px-4 py-2.5 font-medium">
          Back home
        </Link>
      </main>
    );
  }

  return (
    <StudySession
      cards={session.cards}
      dueCount={session.dueCount}
      newCount={session.newCount}
      learnMoreHref={canLearnMore ? `/study?more=${MORE_STEP}` : null}
    />
  );
}
