import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { loadStudySession } from "@/lib/study/session.server";
import { StudySession } from "./session";

export const dynamic = "force-dynamic";

export default async function StudyPage() {
  const { supabase, profile } = await requireUser();
  const session = await loadStudySession(supabase, profile);

  if (session.cards.length === 0) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 text-center">
        <div className="text-5xl">🎉</div>
        <h1 className="mt-4 text-2xl font-bold">All caught up</h1>
        <p className="mt-2 text-muted">
          {session.newLeftToday === 0
            ? "No reviews due, and today's new cards are done. Come back tomorrow."
            : "No reviews due and nothing new is unlocked yet."}
        </p>
        <Link href="/" className="mt-8 rounded-lg bg-accent px-4 py-2.5 font-medium text-white">
          Back home
        </Link>
      </main>
    );
  }

  return <StudySession cards={session.cards} dueCount={session.dueCount} newCount={session.newCount} />;
}
