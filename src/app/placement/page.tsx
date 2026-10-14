import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { loadPlacement } from "@/lib/placement/placement.server";
import { PASS_MARK, QUESTIONS_PER_LEVEL } from "@/lib/placement/placement";
import { PlacementQuiz } from "./quiz";

export const dynamic = "force-dynamic";

export default async function PlacementPage() {
  const { supabase, profile } = await requireUser();
  const quizzes = await loadPlacement(supabase, profile);
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <Link href="/" className="text-sm text-muted underline">
        ← Home
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Placement test</h1>
      <p className="mt-1 text-sm text-muted">
        {QUESTIONS_PER_LEVEL} words per level, starting at N5. Get {PASS_MARK} right to move up. Pick &ldquo;I don&apos;t know&rdquo;
        rather than guess: words you know skip the course and go straight to review.
      </p>
      {quizzes.length === 0 ? (
        <p className="mt-6">You&apos;ve already started every word up to {profile.target_level}. Nothing to place.</p>
      ) : (
        <PlacementQuiz quizzes={quizzes} />
      )}
    </main>
  );
}
